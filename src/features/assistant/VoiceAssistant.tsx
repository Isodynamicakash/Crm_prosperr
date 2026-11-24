import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Pause, Play, RefreshCw, Send, Sparkles, Square } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/lib/i18n';
import { Select } from '@/components/ui/ui';
import { toWav16k, useAiStatus } from '@/features/calls/VoiceNote';

interface Reply { question: string | null; text: string; language: string; audioBase64: string | null }

/** Languages the assistant can speak (Sarvam's voice). */
const VOICES = [
  ['en-IN', 'English'], ['hi-IN', 'हिन्दी'], ['bn-IN', 'বাংলা'], ['ta-IN', 'தமிழ்'], ['te-IN', 'తెలుగు'], ['kn-IN', 'ಕನ್ನಡ'],
  ['ml-IN', 'മലയാളം'], ['mr-IN', 'मराठी'], ['gu-IN', 'ગુજરાતી'], ['pa-IN', 'ਪੰਜਾਬੀ'], ['od-IN', 'ଓଡ଼ିଆ'],
] as const;
const MAX_SECONDS = 25;
const KEY = 'prosperr.voice-lang';

const audioUrl = (b64: string) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
};

/**
 * The BDR's voice assistant: a spoken morning brief built from their own CRM data, and questions by voice or text
 * ("whom should I call first?", "status of Meesho?") answered in the language they speak. It only reads; it never changes data.
 */
export function VoiceAssistant() {
  const ai = useAiStatus();
  const { lang: uiLang } = useLanguage();
  const initial = (() => {
    try { const saved = localStorage.getItem(KEY); if (saved) return saved; } catch { /* storage blocked */ }
    const guess = `${uiLang}-IN`;
    return VOICES.some(([c]) => c === guess) ? guess : 'en-IN';
  })();
  const [lang, setLang] = useState<string>(initial);
  const [reply, setReply] = useState<Reply | null>(null);
  const [busy, setBusy] = useState<'brief' | 'ask' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => { try { localStorage.setItem(KEY, lang); } catch { /* fine */ } }, [lang]);
  useEffect(() => () => { player.current?.pause(); if (timer.current) clearInterval(timer.current); }, []);

  const play = (r: Reply) => {
    player.current?.pause();
    if (!r.audioBase64) return;
    const a = new Audio(audioUrl(r.audioBase64));
    a.onended = () => setPlaying(false);
    a.onpause = () => setPlaying(false);
    a.onplay = () => setPlaying(true);
    player.current = a;
    void a.play().catch(() => setPlaying(false));
  };

  const run = async (kind: 'brief' | 'ask', call: () => Promise<Reply>) => {
    setBusy(kind); setError(null);
    try { const r = await call(); setReply(r); play(r); }
    catch (e) { setError((e as Error).message || 'The assistant could not answer. Try again.'); }
    finally { setBusy(null); }
  };

  const brief = (refresh = false) => run('brief', () => api.get<Reply>('/api/ai/assistant/brief', { lang, refresh: String(refresh) }));
  const askText = () => { const q = typed.trim(); if (!q) return; setTyped(''); void run('ask', () => api.post<Reply>('/api/ai/assistant/ask', { text: q, lang })); };

  const startMic = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) { clearInterval(timer.current); timer.current = null; }
        setRecording(false);
        const blob = new Blob(chunks.current, { type: r.mimeType });
        void run('ask', async () => {
          const fd = new FormData();
          fd.append('audio', await toWav16k(blob), 'question.wav');
          return api.post<Reply>('/api/ai/assistant/ask', fd, { lang });
        });
      };
      rec.current = r;
      player.current?.pause();
      r.start(); setRecording(true); setSeconds(0);
      timer.current = window.setInterval(() => setSeconds((s) => { if (s + 1 >= MAX_SECONDS && r.state === 'recording') r.stop(); return s + 1; }), 1000);
    } catch {
      setError('Microphone is blocked. Allow it in the browser, or type your question.');
    }
  };
  const stopMic = () => { if (rec.current?.state === 'recording') rec.current.stop(); };

  if (!ai.data?.voiceNotes) return null;
  const micOk = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  return (
    <section className="rounded-[24px] border border-line/80 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-forest text-white"><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[18px] font-medium tracking-[-0.02em]">Your day, spoken</p>
          <p className="text-xs text-ink-muted">A short brief from your follow-ups, leads, replies, meetings and target. Ask anything about your work, in your language.</p>
        </div>
        <Select id="voice-lang" value={lang} onChange={(e) => { setLang(e.target.value); setReply(null); }} className="w-32" aria-label="Assistant language">
          {VOICES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </Select>
        <button type="button" onClick={() => (playing ? player.current?.pause() : reply?.audioBase64 && !reply.question ? play(reply) : brief())} disabled={busy !== null}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-forest px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-forest/90 disabled:opacity-60">
          {busy === 'brief' ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {busy === 'brief' ? 'Preparing…' : playing ? 'Pause' : 'Play my brief'}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {micOk && (
          <button type="button" onClick={recording ? stopMic : startMic} disabled={busy !== null && !recording} aria-label={recording ? 'Stop and ask' : 'Ask by voice'}
            className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors disabled:opacity-60',
              recording ? 'border-brand-forest bg-brand-forest text-white' : 'border-line text-brand-forest hover:bg-brand-forest-50')}>
            {busy === 'ask' ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
        <form className="relative min-w-0 flex-1" onSubmit={(e) => { e.preventDefault(); askText(); }}>
          <input id="voice-question" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={recording || busy !== null}
            placeholder={recording ? `Listening… 0:${String(seconds).padStart(2, '0')} — tap the square when done` : 'Ask: whom should I call first? · status of Meesho? · how far am I from target?'}
            className="h-10 w-full rounded-full border border-line bg-canvas/60 pl-4 pr-11 text-[13px] outline-none focus:border-brand-forest/40" />
          <button type="submit" disabled={!typed.trim() || busy !== null} aria-label="Ask"
            className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full text-brand-forest disabled:opacity-30"><Send className="h-4 w-4" /></button>
        </form>
      </div>

      {error && <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-[13px] text-brand-navy">{error}</p>}
      {reply && (
        <div className="mt-3 rounded-2xl bg-brand-forest-50/60 p-3.5">
          {reply.question && <p className="mb-1.5 text-xs text-ink-muted">You asked: “{reply.question}”</p>}
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">{reply.text}</p>
          <div className="mt-2 flex items-center gap-3 text-xs">
            {reply.audioBase64 && (
              <button type="button" onClick={() => (playing ? player.current?.pause() : play(reply))} className="inline-flex items-center gap-1 font-semibold text-brand-forest hover:underline">
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{playing ? 'Pause' : 'Play again'}
              </button>
            )}
            {!reply.question && (
              <button type="button" onClick={() => brief(true)} disabled={busy !== null} className="inline-flex items-center gap-1 font-semibold text-brand-forest hover:underline disabled:opacity-50">
                <RefreshCw className="h-3.5 w-3.5" />Refresh
              </button>
            )}
            <span className="text-ink-muted">Read-only: it looks at your data and never changes anything.</span>
          </div>
        </div>
      )}
    </section>
  );
}
