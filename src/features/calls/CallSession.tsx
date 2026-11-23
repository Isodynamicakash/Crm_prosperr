import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarCheck2, Linkedin, Mail, Phone, PhoneCall, SkipForward, Square, Trophy, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { relTime } from '@/lib/format';
import type { AccountView, LogCallResult, MyDayItem, StakeholderView, TimelineEvent } from '@/lib/types';
import { Avatar, Button } from '@/components/ui/ui';
import { LogCallModal } from './LogCallModal';
import { WhatsAppButton } from './WhatsApp';
import { SubmitSqlModal } from '@/features/sql/SqlForms';

/** Engagement statuses that mean the BDR actually spoke to the person. */
const REACHED = new Set(['CONNECTED', 'MEETING_SCHEDULED', 'FOLLOW_UP_PENDING', 'REFERRED', 'NOT_RELEVANT', 'MEETING_COMPLETED']);

interface AccountPage { account: AccountView; stakeholdersByDepartment: Record<string, StakeholderView[]>; timeline: TimelineEvent[] }

const clock = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/**
 * Power-dialler style calling session over the My Day list: one person at a time with everything needed for the call,
 * a big Call button, log the outcome and move straight to the next. Tallies calls, people reached and L1s booked.
 */
export function CallSession({ items, onExit }: { items: MyDayItem[]; onExit: () => void }) {
  const qc = useQueryClient();
  const [queue] = useState(items);                 // freeze the order for the whole session
  const [i, setI] = useState(0);
  const [logging, setLogging] = useState(false);
  const [dialled, setDialled] = useState(false);
  const [done, setDone] = useState<Record<string, 'reached' | 'notReached' | 'booked'>>({});
  const [sqlFor, setSqlFor] = useState<{ accountId: string; accountName: string; stakeholders: StakeholderView[]; account: AccountView } | null>(null);
  const [ended, setEnded] = useState(false);
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const item = queue[i];
  const page = useQuery({ queryKey: ['account', item?.accountId], queryFn: () => api.get<AccountPage>(`/api/accounts/${item!.accountId}`), enabled: !!item && !ended });
  const person = useMemo(() => Object.values(page.data?.stakeholdersByDepartment ?? {}).flat().find((s) => s.id === item?.stakeholderId), [page.data, item]);
  const notes = (page.data?.timeline ?? []).filter((e) => e.summary).slice(0, 3);
  const email = person?.emails.find((e) => e.primary && e.valid) ?? person?.emails.find((e) => e.valid);

  const stats = useMemo(() => {
    const v = Object.values(done);
    return { calls: v.length, reached: v.filter((x) => x !== 'notReached').length, booked: v.filter((x) => x === 'booked').length };
  }, [done]);

  const next = () => { setDialled(false); if (i + 1 >= queue.length) setEnded(true); else setI(i + 1); };
  const back = () => { setDialled(false); setI(Math.max(0, i - 1)); };
  const finish = () => { qc.invalidateQueries({ queryKey: ['my-day'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); onExit(); };

  const onLogged = async (r: LogCallResult) => {
    const status = r.plan?.newStatus;
    setDone((d) => ({ ...d, [item!.stakeholderId!]: r.openL1Booking ? 'booked' : status && REACHED.has(status) ? 'reached' : 'notReached' }));
    setLogging(false);
    if (r.openL1Booking && page.data) {
      const st = await api.get<StakeholderView[]>(`/api/accounts/${item!.accountId}/stakeholders`);
      setSqlFor({ accountId: item!.accountId, accountName: item!.accountName, stakeholders: st, account: page.data.account });
      return;                                       // move on once the SQL form closes
    }
    next();
  };

  // Keyboard: C call, L log, S/→ skip, ← back, Esc end
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (logging || sqlFor || ended || /input|textarea|select/i.test((e.target as HTMLElement).tagName)) return;
      if (e.key === 'l') setLogging(true);
      else if (e.key === 's' || e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
      else if (e.key === 'c' && item?.phone) { setDialled(true); window.location.href = `tel:${item.phone}`; }
      else if (e.key === 'Escape') setEnded(true);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#0D0F0D] text-paper">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-5 sm:px-6">
        {/* top bar */}
        <div className="flex items-center gap-3">
          <span className="flex h-9 items-center gap-2 rounded-full bg-brand-mint/15 px-3 text-xs font-semibold text-brand-mint"><span className="h-2 w-2 rounded-full bg-brand-mint motion-safe:animate-pulse" />Calling session · {clock(now - started)}</span>
          <span className="text-xs text-paper/50">{Math.min(i + 1, queue.length)} of {queue.length}</span>
          <div className="ml-auto flex gap-1.5">
            {[['Calls', stats.calls], ['Reached', stats.reached], ['L1 booked', stats.booked]].map(([k, v]) => (
              <span key={k} className="rounded-full border border-white/10 px-3 py-1.5 text-xs"><b className="tabular-nums text-paper">{v}</b> <span className="text-paper/50">{k}</span></span>
            ))}
          </div>
          <button onClick={() => setEnded(true)} aria-label="End session" className="grid h-9 w-9 place-items-center rounded-full text-paper/60 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand-mint transition-all" style={{ width: `${(100 * Object.keys(done).length) / Math.max(1, queue.length)}%` }} /></div>

        {ended ? (
          <div className="my-auto py-16 text-center">
            <Trophy className="mx-auto h-10 w-10 text-brand-mint" />
            <p className="mt-4 font-display text-[30px] font-medium tracking-[-0.02em]">Session done</p>
            <p className="mt-1 text-sm text-paper/60">{clock(now - started)} on the phone list</p>
            <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-2">
              {[['Calls logged', stats.calls], ['People reached', stats.reached], ['L1s booked', stats.booked]].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="font-display text-[28px] tabular-nums">{v}</p><p className="text-xs text-paper/55">{k}</p></div>
              ))}
            </div>
            <div className="mt-6 flex justify-center gap-2">
              {i + 1 < queue.length && <Button onClick={() => setEnded(false)} className="border-white/15 bg-white/10 text-paper hover:bg-white/15">Keep going</Button>}
              <Button variant="primary" onClick={finish}>Back to My Day</Button>
            </div>
          </div>
        ) : item && (
          <>
            {/* the person */}
            <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <Avatar name={item.stakeholderName ?? item.accountName} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-mint">{item.section === 'UNTOUCHED' ? 'First call' : item.section === 'OVERDUE' ? 'Overdue follow-up' : 'Due today'}</p>
                  <p className="mt-1 truncate font-display text-[28px] font-medium leading-tight tracking-[-0.02em]">{item.stakeholderName}</p>
                  <p className="truncate text-sm text-paper/65">{item.designation ? `${item.designation} · ` : ''}
                    <Link to={`/accounts/${item.accountId}?stakeholder=${item.stakeholderId}`} onClick={finish} className="font-semibold text-paper hover:text-brand-mint">{item.accountName}</Link></p>
                  <p className="mt-2 text-xs text-paper/45">
                    {person ? `${person.callAttempts} earlier call${person.callAttempts === 1 ? '' : 's'}${person.lastInteractionAt ? ` · last ${relTime(person.lastInteractionAt)}` : ''}` : 'Loading…'}
                    {item.title && ` · ${item.title}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  {email && <a href={`mailto:${email.email}`} title={email.email} className="grid h-9 w-9 place-items-center rounded-full text-paper/60 hover:bg-white/10"><Mail className="h-4 w-4" /></a>}
                  {person?.linkedinUrl && <a href={person.linkedinUrl.startsWith('http') ? person.linkedinUrl : `https://${person.linkedinUrl}`} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full text-paper/60 hover:bg-white/10"><Linkedin className="h-4 w-4" /></a>}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                {item.phone ? (
                  <a href={`tel:${item.phone}`} onClick={() => setDialled(true)}
                    className={cn('flex h-14 flex-1 items-center justify-center gap-2.5 rounded-2xl text-[17px] font-bold tabular-nums transition-transform hover:scale-[1.01]',
                      dialled ? 'border border-brand-mint/40 bg-brand-mint/10 text-brand-mint' : 'bg-brand-mint text-brand-night shadow-[0_0_30px_rgba(35,178,74,.35)]')}>
                    <Phone className="h-5 w-5" />{dialled ? `Calling ${item.phone}…` : `Call ${item.phone}`}
                  </a>
                ) : <p className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-paper/50">No phone number. Log another way or skip.</p>}
                {item.phone && <WhatsAppButton phone={item.phone} name={item.stakeholderName} onOpened={() => setDialled(true)} className="h-14 rounded-2xl border-white/15 bg-white/10 px-5 text-paper hover:bg-white/15" />}
              </div>
              <button onClick={() => setLogging(true)}
                className={cn('mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition-colors',
                  dialled ? 'bg-paper text-brand-night hover:bg-white' : 'border border-white/15 text-paper hover:bg-white/10')}>
                <PhoneCall className="h-4 w-4" />Log what happened
              </button>
            </div>

            {/* context */}
            <div className="mt-4 rounded-[22px] border border-white/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/45">Latest on {item.accountName}</p>
              {page.isLoading ? <p className="mt-2 text-sm text-paper/40">Loading…</p> : notes.length === 0 ? <p className="mt-2 text-sm text-paper/50">Nothing logged yet. Fresh lead.</p> : (
                <ul className="mt-2 space-y-2">
                  {notes.map((n) => (
                    <li key={n.id} className="text-[13px] leading-snug"><span className="text-paper/45">{relTime(n.at)}{n.byName && ` · ${n.byName}`} · </span><span className="text-paper/85">{n.summary}</span></li>
                  ))}
                </ul>
              )}
            </div>

            {/* controls */}
            <div className="mt-auto flex items-center gap-2 pt-6">
              <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} disabled={i === 0} onClick={back} className="text-paper/70 hover:bg-white/10 hover:text-paper">Back</Button>
              <span className="hidden flex-1 text-center text-[11px] text-paper/35 sm:block">C call · L log · S skip · ← back · Esc end</span>
              <Button variant="ghost" icon={<SkipForward className="h-4 w-4" />} onClick={next} className="ml-auto text-paper/70 hover:bg-white/10 hover:text-paper sm:ml-0">Skip</Button>
              <Button variant="ghost" icon={<Square className="h-3.5 w-3.5" />} onClick={() => setEnded(true)} className="text-paper/70 hover:bg-white/10 hover:text-paper">End</Button>
            </div>
            {queue[i + 1] && <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-paper/40"><CalendarCheck2 className="h-3.5 w-3.5" />Next: {queue[i + 1].stakeholderName} · {queue[i + 1].accountName}</p>}
          </>
        )}
      </div>

      <LogCallModal open={logging} onClose={() => setLogging(false)} onLogged={onLogged}
        target={item?.stakeholderId ? { stakeholderId: item.stakeholderId, name: item.stakeholderName ?? 'Stakeholder', designation: item.designation, accountName: item.accountName, phones: person?.phones } : null} />
      {sqlFor && <SubmitSqlModal open onClose={() => { setSqlFor(null); next(); }} {...sqlFor} />}
    </div>
  );
}
