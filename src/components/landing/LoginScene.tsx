import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CalendarCheck2, CheckCircle2, ClipboardCheck, Handshake, PhoneCall, Trophy, UserCheck, type LucideIcon } from 'lucide-react';
import { ease } from '@/lib/animations';
import { CountUp } from '@/lib/animations/components';
import { TiltCard } from './Brand3D';

const SAMPLE_KPIS = [
  { label: 'Calls logged', to: 128 },
  { label: 'SQLs approved', to: 9 },
  { label: 'Meetings booked', to: 14 },
];

const SAMPLE_EVENTS: { icon: LucideIcon; text: string; time: string }[] = [
  { icon: PhoneCall, text: 'Priya logged a call with Northwind · L1 booked', time: 'now' },
  { icon: ClipboardCheck, text: 'SQL for Kestrel Fintech approved by Meera', time: '2m' },
  { icon: UserCheck, text: 'Orbit Pay assigned to Arjun (AE)', time: '6m' },
  { icon: CalendarCheck2, text: 'L2 with Lumen Health moved to Thu 11:00', time: '12m' },
  { icon: CheckCircle2, text: 'Follow-up created automatically for Rahul M.', time: '15m' },
  { icon: Trophy, text: 'Sterling Foods marked Closed Won', time: '21m' },
];

interface PublicStats { period: 'TODAY' | 'WEEK' | 'MONTH'; kpis: { calls: number; sqls: number; meetings: number }; recent: { kind: string; at: string }[] }

/** What each event kind says on the public page: never a company or person name. */
const KIND: Record<string, { icon: LucideIcon; text: string }> = {
  CALL: { icon: PhoneCall, text: 'A call was logged' },
  CALL_L1: { icon: PhoneCall, text: 'A call booked an L1 meeting' },
  STAGE_SQL: { icon: ClipboardCheck, text: 'An SQL was submitted' },
  STAGE_L1: { icon: CalendarCheck2, text: 'An L1 meeting was held' },
  STAGE_L2: { icon: CalendarCheck2, text: 'A deal moved to L2' },
  STAGE_L3: { icon: CalendarCheck2, text: 'A deal moved to L3' },
  STAGE_NEGOTIATION: { icon: Handshake, text: 'A deal reached negotiation' },
  STAGE_WON: { icon: Trophy, text: 'A deal was won' },
  ASSIGNED: { icon: UserCheck, text: 'An account was assigned to an AE' },
  TASK: { icon: CheckCircle2, text: 'A follow-up was created automatically' },
};
const PERIOD = { TODAY: 'Today across the team', WEEK: 'This week across the team', MONTH: 'This month across the team' } as const;

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h`;
  if (m < 60 * 24 * 30) return `${Math.round(m / 1440)}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Left side of the sign-in page: the pitch, a live team panel and the role chips, all on one left edge. */
export function LoginScene() {
  const reduce = useReducedMotion();
  const stats = useQuery({
    queryKey: ['public-stats'], queryFn: () => api.get<PublicStats>('/public/stats'),
    staleTime: 60_000, refetchInterval: 60_000, retry: 1,
  });
  const live = stats.data;
  const kpis = live ? [
    { label: 'Calls logged', to: live.kpis.calls },
    { label: 'SQLs', to: live.kpis.sqls },
    { label: 'Meetings booked', to: live.kpis.meetings },
  ] : SAMPLE_KPIS;
  const events = live && live.recent.length
    ? live.recent.map((e) => ({ ...(KIND[e.kind] ?? KIND.CALL), time: ago(e.at) }))
    : SAMPLE_EVENTS;
  const [start, setStart] = useState(0);
  useEffect(() => {
    if (reduce || events.length <= 3) return;
    const t = window.setInterval(() => setStart((s) => (s + 1) % events.length), 2600);
    return () => window.clearInterval(t);
  }, [reduce, events.length]);
  const feed = [0, 1, 2].slice(0, Math.min(3, events.length)).map((k) => events[(start + k) % events.length]);
  const rise = (d: number) => ({ initial: { opacity: 0, y: 20, filter: 'blur(8px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { duration: 0.85, delay: d, ease: ease.out } });

  return (
    <section className="w-full max-w-[560px] text-paper lg:justify-self-start">
      <motion.p {...rise(0.2)} className="eyebrow-dark"><span className="h-1.5 w-1.5 rounded-full bg-brand-mint" />Sales CRM · B2B team</motion.p>
      <motion.h2 {...rise(0.3)} className="mt-5 font-display text-[36px] font-medium leading-[1.04] tracking-[-0.04em] sm:text-[48px] lg:text-[54px]">
        A sales CRM for a team that <span className="dim-dark">no longer fits a spreadsheet.</span>
      </motion.h2>
      <motion.p {...rise(0.4)} className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-paper/70 sm:text-[17px]">
        Accounts, stakeholders and next steps for Prosperr's B2B sales, managed in one place.
      </motion.p>

      {/* live panel */}
      <motion.div {...rise(0.55)} className="mt-8">
        <TiltCard max={5} className="rounded-[28px]">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#101311]/80 p-5 backdrop-blur-xl sm:p-6">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-mint/20 blur-3xl" />
            <div className="relative flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/50">{live ? PERIOD[live.period] : 'Today across the team'}</p>
              <span className="flex items-center gap-1.5 rounded-full bg-brand-mint/15 px-2.5 py-1 text-[11px] font-semibold text-brand-mint">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute h-full w-full rounded-full bg-brand-mint motion-safe:animate-ping" /><span className="relative h-1.5 w-1.5 rounded-full bg-brand-mint" /></span>Live
              </span>
            </div>
            <div className="relative mt-4 grid grid-cols-3 gap-2.5">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-3">
                  <p className="font-display text-[26px] font-medium leading-none tracking-[-0.03em] sm:text-[30px]"><CountUp to={k.to} /></p>
                  <p className="mt-1.5 text-[11px] leading-tight text-paper/55 sm:text-[12px]">{k.label}</p>
                </div>
              ))}
            </div>
            <ul className="relative mt-4 space-y-2" aria-live="off">
              {feed.map((e, k) => (
                <li key={k} className="relative h-[46px] overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03]">
                  <AnimatePresence initial={false} mode="wait">
                    <motion.div key={`${e.text}-${e.time}-${k}`} initial={{ opacity: 0, y: -16 }} animate={{ opacity: k === 2 ? 0.55 : 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.35, delay: k * 0.06, ease: ease.out }} className="absolute inset-0 flex items-center gap-3 px-3">
                      <span className={k === 0 ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-mint text-brand-night shadow-[0_0_16px_rgba(35,178,74,.5)]' : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-mint/15 text-brand-mint'}>
                        <e.icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-paper/85">{e.text}</span>
                      <span className="shrink-0 font-mono text-[10.5px] text-paper/40">{e.time}</span>
                    </motion.div>
                  </AnimatePresence>
                </li>
              ))}
            </ul>
            <p className="relative mt-3 text-[10.5px] uppercase tracking-[0.14em] text-paper/30">{live ? 'Live team activity · no client details shown' : 'Illustrative sample data'}</p>
          </div>
        </TiltCard>
      </motion.div>

      <motion.div initial="h" animate="s" variants={{ h: {}, s: { transition: { staggerChildren: 0.06, delayChildren: 0.75 } } }} className="mt-6 flex flex-wrap gap-2">
        {['BDR', 'Account Executive', 'Sales Manager', 'Leadership', 'Admin'].map((c) => (
          <motion.span key={c} variants={{ h: { opacity: 0, y: 10 }, s: { opacity: 1, y: 0 } }}
            className="rounded-full border border-paper/20 px-3.5 py-1.5 text-[13px] text-paper/80 transition-colors hover:border-brand-mint/60 hover:text-paper">{c}</motion.span>
        ))}
      </motion.div>
    </section>
  );
}
