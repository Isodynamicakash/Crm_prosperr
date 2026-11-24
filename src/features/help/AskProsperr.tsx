import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp, RotateCcw, X } from 'lucide-react';
import { Sprout } from './Sprout';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

interface Msg { role: 'user' | 'assistant'; text: string; sources?: { title: string; page: string }[]; error?: boolean }
const KEY = 'prosperr.ask';

/** **bold**, [label](/path) links inside the app, and "1." / "-" lists: all the formatting the assistant uses. */
function Rich({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const inline = (s: string, k: string): ReactNode[] => {
    const out: ReactNode[] = [];
    const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((\/[^)\s]*)\)/g;
    let last = 0; let m: RegExpExecArray | null; let i = 0;
    while ((m = re.exec(s))) {
      if (m.index > last) out.push(s.slice(last, m.index));
      if (m[1]) out.push(<b key={`${k}b${i++}`} className="font-semibold">{m[1]}</b>);
      else out.push(<Link key={`${k}l${i++}`} to={m[3]} onClick={onNavigate} className="font-semibold text-brand-forest underline underline-offset-2">{m[2]}</Link>);
      last = re.lastIndex;
    }
    if (last < s.length) out.push(s.slice(last));
    return out;
  };
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(<Tag key={`list${blocks.length}`} className={cn('my-1 space-y-0.5 pl-5', list.ordered ? 'list-decimal' : 'list-disc')}>
      {list.items.map((it, j) => <li key={j}>{inline(it, `li${blocks.length}-${j}`)}</li>)}</Tag>);
    list = null;
  };
  lines.forEach((ln, idx) => {
    const o = ln.match(/^\s*\d+[.)]\s+(.*)/); const u = ln.match(/^\s*[-•*]\s+(.*)/);
    if (o || u) {
      const ordered = !!o;
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push((o ?? u)![1]);
    } else {
      flush();
      if (ln.trim()) blocks.push(<p key={`p${idx}`} className="my-1">{inline(ln, `p${idx}`)}</p>);
    }
  });
  flush();
  return <>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</>;
}

/** Ask Prosperr: a help chat for BDRs about how the CRM works. It answers from the BDR guide and never touches data. */
export function AskProsperr() {
  const { pathname } = useLocation();
  const info = useQuery({ queryKey: ['help-info'], queryFn: () => api.get<{ enabled: boolean; suggestions: string[] }>('/api/ai/help/suggestions'), staleTime: 3_600_000 });
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as Msg[]; } catch { return []; } });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30))); } catch { /* storage blocked */ } }, [msgs]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy, open]);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 50); }, [open]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  if (!info.data?.enabled) return null;

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const history = msgs.filter((m) => !m.error).slice(-6).map((m) => ({ role: m.role, text: m.text }));
    setMsgs((cur) => [...cur, { role: 'user', text: question }]);
    setText(''); setBusy(true);
    try {
      const r = await api.post<{ answer: string; sources: { title: string; page: string }[] }>('/api/ai/help', { question, history, page: pathname });
      setMsgs((cur) => [...cur, { role: 'assistant', text: r.answer, sources: r.sources }]);
    } catch (e) {
      setMsgs((cur) => [...cur, { role: 'assistant', text: (e as Error).message || 'Something went wrong. Try again.', error: true }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="Ask Prosperr"
          className="group fixed bottom-24 right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full border border-brand-forest/15 bg-white pl-1.5 pr-4 text-[13px] font-semibold text-brand-forest shadow-[0_14px_34px_-12px_rgba(5,63,26,.55)] transition-transform hover:-translate-y-0.5 lg:bottom-6 lg:right-6">
          <Sprout size={46} className="-mt-2 transition-transform group-hover:rotate-[-6deg]" />Ask Prosperr
        </button>
      )}
      {open && (
        <section role="dialog" aria-label="Ask Prosperr"
          className="fixed inset-x-2 bottom-2 top-16 z-[70] flex flex-col overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,.45)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[600px] sm:max-h-[calc(100vh-6rem)] sm:w-[400px]">
          <header className="flex items-center gap-3 bg-brand-forest px-4 py-3 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/95"><Sprout size={38} thinking={busy} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight">Ask Prosperr</p>
              <p className="text-[11.5px] text-white/70">{busy ? 'Thinking…' : 'Your CRM buddy · ask in any language'}</p>
            </div>
            {msgs.length > 0 && <button type="button" onClick={() => setMsgs([])} title="New chat" aria-label="New chat" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15"><RotateCcw className="h-4 w-4" /></button>}
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15"><X className="h-4 w-4" /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-canvas/50 px-3 py-3 text-[13.5px] leading-relaxed">
            {msgs.length === 0 && (
              <div className="space-y-3">
                <div className="flex flex-col items-center pt-2"><Sprout size={72} /><p className="mt-1 font-display text-[17px] font-medium">Hi, I'm Sprout</p></div>
                <p className="rounded-2xl bg-white px-3.5 py-3 shadow-sm">Ask me anything about using the CRM: where to find something, what a rule means, or how to do a task. I answer from the BDR guide and can't see or change your data.</p>
                <div className="flex flex-wrap gap-1.5">
                  {info.data.suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border border-brand-forest/20 bg-white px-3 py-1.5 text-left text-[12.5px] text-brand-forest hover:bg-brand-forest-50">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => m.role === 'user' ? (
              <div key={i} className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-forest px-3.5 py-2 text-white">{m.text}</p></div>
            ) : (
              <div key={i} className="flex items-end gap-1.5">
              <Sprout size={26} className="mb-0.5" />
              <div className={cn('max-w-[86%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 shadow-sm', m.error && 'text-brand-navy')}>
                <Rich text={m.text} onNavigate={() => { if (window.innerWidth < 640) setOpen(false); }} />
                {!!m.sources?.length && (
                  <div className="mt-2 flex flex-wrap gap-1 border-t border-line/70 pt-2">
                    {m.sources.map((s) => (
                      <Link key={s.title} to={s.page} onClick={() => { if (window.innerWidth < 640) setOpen(false); }}
                        className="rounded-full bg-brand-forest-50 px-2 py-0.5 text-[11px] text-brand-forest hover:underline">{s.title}</Link>
                    ))}
                  </div>
                )}
              </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-end gap-1.5"><Sprout size={26} thinking className="mb-0.5" />
                <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 shadow-sm">
                  {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-forest/60" style={{ animationDelay: `${d * 0.15}s` }} />)}
                </div></div>
            )}
            <div ref={end} />
          </div>

          <form className="flex items-end gap-2 border-t border-line bg-white p-2.5" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
            <textarea ref={input} id="ask-prosperr" rows={1} value={text} maxLength={500} placeholder="Ask in any language…"
              onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(text); } }}
              className="max-h-28 min-h-[40px] flex-1 resize-none rounded-2xl border border-line bg-canvas/60 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-brand-forest/40" />
            <button type="submit" disabled={!text.trim() || busy} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-forest text-white disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
          </form>
        </section>
      )}
    </>
  );
}
