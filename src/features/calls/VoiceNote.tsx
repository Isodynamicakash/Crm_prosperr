import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Keyboard, Loader2, Mic, Sparkles, Square, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

export interface CallNoteSuggestion {
  transcript: string;
  outcomeCode: string | null;
  outcomeLabel: string | null;
  remark: string | null;
  followUpDate: string | null;
  reason: string | null;
}

const MAX_SECONDS = 30;

/** Hidden entirely when the server has no AI key (or runs an older build without the endpoint). */
export function useAiStatus() {
  return useQuery({
    queryKey: ['ai-status'],
    queryFn: () => api.get<{ voiceNotes: boolean }>('/api/ai/status'),
    staleTime: 5 * 60_000, refetchInterval: false, retry: false,
  });
}

/**
 * "Speak or paste, and AI fills the form." Works in English, Hindi and the other Indian languages Sarvam supports.
 * The result only pre-fills fields; the person still checks them and presses Save.
 */
export function AiAssist<T extends { transcript: string }>({ endpoint, onResult, title, example, allowPaste = true, pastePlaceholder }: {
  endpoint: string; onResult: (s: T) => void; title?: string; example?: string; allowPaste?: boolean; pastePlaceholder?: string;
}) {
  const t = useT();
  const status = useAiStatus();
  const [state, setState] = useState<'idle' | 'recording' | 'working'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => stopTracks(), []);

  if (!status.data?.voiceNotes) return null;
  const micSupported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  function stopTracks() {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    rec.current?.stream.getTracks().forEach((tr) => tr.stop());
  }

  async function start() {
    setError(null); setHeard(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => { stopTracks(); void sendAudio(new Blob(chunks.current, { type: r.mimeType })); };
      rec.current = r;
      r.start();
      setSeconds(0); setState('recording');
      timer.current = window.setInterval(() => setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS && r.state === 'recording') r.stop();
        return s + 1;
      }), 1000);
    } catch {
      setError(t('ai.micBlocked'));
    }
  }

  function stop() { if (rec.current?.state === 'recording') rec.current.stop(); }

  async function run(call: () => Promise<T>) {
    setState('working'); setError(null);
    try {
      const s = await call();
      setHeard(s.transcript);
      onResult(s);
    } catch (e) {
      setError((e as Error).message || t('ai.failed'));
    } finally {
      setState('idle');
    }
  }

  async function sendAudio(blob: Blob) {
    await run(async () => {
      const fd = new FormData();
      let wav: Blob;
      try { wav = await toWav16k(blob); }
      catch { throw new Error(t('ai.badAudio')); }
      fd.append('audio', wav, 'note.wav');
      return api.post<T>(endpoint, fd);
    });
  }

  async function sendText() {
    if (!text.trim()) return;
    await run(() => api.post<T>(endpoint, { text }));
  }

  return (
    <div className="rounded-2xl border border-brand-forest/15 bg-gradient-to-br from-brand-forest-50/80 to-white p-3">
      <div className="flex items-center gap-3">
        <button type="button" disabled={!micSupported || state === 'working'}
          onClick={state === 'recording' ? stop : start}
          aria-label={state === 'recording' ? t('ai.stop') : t('ai.record')}
          className={cn('relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-forest text-white transition-all disabled:opacity-50',
            state === 'recording' ? 'ring-4 ring-brand-mint/40' : 'hover:scale-105')}>
          {state === 'recording' && <span className="absolute inset-0 animate-ping rounded-full bg-brand-mint/40" />}
          {state === 'working' ? <Loader2 className="h-5 w-5 animate-spin" /> : state === 'recording' ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-forest">
            <Sparkles className="h-3.5 w-3.5" />
            {state === 'recording' ? `${t('ai.listening')} 0:${String(seconds).padStart(2, '0')} / 0:${MAX_SECONDS}`
              : state === 'working' ? t('ai.working') : (title ?? t('ai.sayWhatHappened'))}
          </p>
          <p className="truncate text-xs text-ink-muted">
            {!micSupported ? t('ai.noMic') : state === 'recording' ? t('ai.tapToStop') : (example ?? t('ai.anyLanguage'))}
          </p>
        </div>
        {state === 'idle' && (
          <>
            <input ref={fileInput} type="file" accept="audio/*,.opus,.ogg,.m4a,.mp3,.wav,.aac" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setError(null); setHeard(null); void sendAudio(f); } }} />
            <button type="button" onClick={() => fileInput.current?.click()} title={t('ai.uploadHint')} aria-label={t('ai.uploadVoice')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:border-brand-forest/40 hover:text-brand-forest">
              <Upload className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {allowPaste && state === 'idle' && (
          <button type="button" onClick={() => setTyping((v) => !v)} title={t('ai.typeInstead')}
            className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors',
              typing ? 'border-brand-forest bg-brand-forest text-white' : 'border-line bg-white text-ink-soft hover:border-brand-forest/40')}>
            <Keyboard className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('ai.typeInstead')}</span>
          </button>
        )}
      </div>
      {typing && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={pastePlaceholder ?? t('ai.pastePlaceholder')}
            className="min-h-[60px] flex-1 rounded-xl border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-brand-forest/50" />
          <button type="button" disabled={!text.trim() || state === 'working'} onClick={sendText}
            className="h-9 shrink-0 self-end rounded-full bg-brand-forest px-4 text-xs font-semibold text-white disabled:opacity-50">
            {t('ai.fill')}
          </button>
        </div>
      )}
      {heard && !typing && <p className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs text-ink-soft"><span className="font-semibold text-brand-forest">{t('ai.heard')} </span>{heard}</p>}
      {error && <p className="mt-2 text-xs text-ink-soft">{error}</p>}
    </div>
  );
}

/** The call-log flavour, kept for existing callers. */
export function VoiceNote({ onResult }: { onResult: (s: CallNoteSuggestion) => void }) {
  return <AiAssist<CallNoteSuggestion> endpoint="/api/ai/call-note" onResult={onResult} />;
}

/** Browser recordings are WebM/Opus or MP4; Sarvam gets 16 kHz mono 16-bit WAV, which every browser can produce. */
export async function toWav16k(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const rate = 16_000;
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    const buf = new ArrayBuffer(44 + pcm.length * 2);
    const v = new DataView(buf);
    const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
  } finally {
    void ctx.close();
  }
}
