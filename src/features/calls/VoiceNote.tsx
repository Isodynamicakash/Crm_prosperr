import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Mic, Sparkles, Square } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

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
 * Record a short voice note (Hindi, English or a mix), get back suggested call-log fields.
 * The suggestion only pre-fills the form; the BDR still checks it and presses Save.
 */
export function VoiceNote({ onResult }: { onResult: (s: CallNoteSuggestion) => void }) {
  const status = useAiStatus();
  const [state, setState] = useState<'idle' | 'recording' | 'working'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => () => stopTracks(), []);

  if (!status.data?.voiceNotes) return null;
  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  function stopTracks() {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    rec.current?.stream.getTracks().forEach((t) => t.stop());
  }

  async function start() {
    setError(null); setHeard(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => { stopTracks(); void send(new Blob(chunks.current, { type: r.mimeType })); };
      rec.current = r;
      r.start();
      setSeconds(0); setState('recording');
      timer.current = window.setInterval(() => setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) r.state === 'recording' && r.stop();
        return s + 1;
      }), 1000);
    } catch {
      setError('Allow microphone access in the browser to use voice notes.');
    }
  }

  function stop() { if (rec.current?.state === 'recording') rec.current.stop(); }

  async function send(blob: Blob) {
    setState('working');
    try {
      const wav = await toWav16k(blob);
      const fd = new FormData();
      fd.append('audio', wav, 'note.wav');
      const s = await api.post<CallNoteSuggestion>('/api/ai/call-note', fd);
      setHeard(s.transcript);
      onResult(s);
    } catch (e) {
      setError((e as Error).message || 'Couldn’t process the voice note. Fill the form by hand.');
    } finally {
      setState('idle');
    }
  }

  return (
    <div className="rounded-2xl border border-brand-forest/15 bg-gradient-to-br from-brand-forest-50/80 to-white p-3">
      <div className="flex items-center gap-3">
        <button type="button" disabled={!supported || state === 'working'}
          onClick={state === 'recording' ? stop : start}
          aria-label={state === 'recording' ? 'Stop recording' : 'Record a voice note'}
          className={cn('relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-all disabled:opacity-50',
            state === 'recording' ? 'bg-brand-forest ring-4 ring-brand-mint/40' : 'bg-brand-forest hover:scale-105')}>
          {state === 'recording' && <span className="absolute inset-0 animate-ping rounded-full bg-brand-mint/40" />}
          {state === 'working' ? <Loader2 className="h-5 w-5 animate-spin" /> : state === 'recording' ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-forest">
            <Sparkles className="h-3.5 w-3.5" />
            {state === 'recording' ? `Listening… 0:${String(seconds).padStart(2, '0')} / 0:${MAX_SECONDS}`
              : state === 'working' ? 'Filling the form for you…' : 'Say what happened'}
          </p>
          <p className="truncate text-xs text-ink-muted">
            {!supported ? 'Voice notes need a browser with microphone support.'
              : state === 'recording' ? 'Tap the square when you’re done.'
              : 'Hindi, English or both. e.g. “Didn’t pick, call him back next Monday.”'}
          </p>
        </div>
      </div>
      {heard && <p className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs text-ink-soft"><span className="font-semibold text-brand-forest">Heard: </span>{heard}</p>}
      {error && <p className="mt-2 text-xs text-ink-soft">{error}</p>}
    </div>
  );
}

/** Browser recordings are WebM/Opus or MP4; Sarvam gets 16 kHz mono 16-bit WAV, which every browser can produce. */
async function toWav16k(blob: Blob): Promise<Blob> {
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
