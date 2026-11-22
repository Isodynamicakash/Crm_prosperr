import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Check, Mic, PhoneCall, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ease } from '@/lib/animations';

/*
 * The three floating hero cards. Frosted dark glass with a slowly orbiting green edge light,
 * each running a small live loop. All names and numbers are illustrative sample data.
 */

function Glass({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div className={cn('relative overflow-hidden rounded-[22px] p-px shadow-[0_30px_70px_-20px_rgba(0,0,0,.75),0_0_40px_-10px_rgba(35,178,74,.25)]', className)}>
      {/* orbiting edge light */}
      <div className="absolute -inset-[60%] motion-safe:animate-[spin_7s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_250deg,rgba(35,178,74,.9)_310deg,rgba(239,239,239,.7)_330deg,transparent_360deg)]"
        style={{ animationDelay: `${-delay}s` }} />
      <div className="absolute inset-0 rounded-[22px] bg-white/[0.08]" />
      <div className="relative rounded-[21px] bg-[#101311]/90 p-4 text-paper backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        {children}
      </div>
    </div>
  );
}

const Label = ({ children }: { children: ReactNode }) => (
  <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-paper/50">{children}</p>
);

/* ---------- 1. ICP score: gauge fills, checks tick one by one, then "Ready" ---------- */
export function IcpCard() {
  const reduce = useReducedMotion();
  const checks = ['BANT', 'Licenses', 'Location', 'Stakeholder'];
  const [n, setN] = useState(reduce ? checks.length : 0);
  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setN((v) => (v >= checks.length + 3 ? 0 : v + 1)), 900);
    return () => window.clearInterval(t);
  }, [reduce, checks.length]);
  const done = Math.min(n, checks.length);
  const score = Math.round(40 + (done / checks.length) * 52);
  return (
    <Glass className="w-[270px]" delay={0}>
      <div className="flex items-start justify-between">
        <div>
          <Label><Sparkles className="h-3 w-3 text-brand-mint" />ICP score</Label>
          <p className="mt-1 text-[14px] font-semibold">Northwind Logistics</p>
        </div>
        <div className="relative h-14 w-14">
          <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="4" />
            <motion.circle cx="22" cy="22" r="18" fill="none" stroke="#23B24A" strokeWidth="4" strokeLinecap="round" pathLength={1}
              animate={{ pathLength: score / 100 }} transition={{ duration: 0.6, ease: ease.out }} style={{ filter: 'drop-shadow(0 0 4px rgba(35,178,74,.8))' }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-[15px] font-semibold tabular-nums">{score}</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {checks.map((c, i) => (
          <span key={c} className={cn('flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition-colors duration-300',
            i < done ? 'border-brand-mint/40 bg-brand-mint/10 text-paper' : 'border-white/10 text-paper/45')}>
            <span className={cn('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors', i < done ? 'bg-brand-mint text-brand-night' : 'border border-white/25')}>
              {i < done && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
            </span>
            {c}
          </span>
        ))}
      </div>
      <div className={cn('mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-[11.5px] font-semibold transition-all duration-500',
        done === checks.length ? 'bg-brand-mint text-brand-night shadow-[0_0_24px_rgba(35,178,74,.55)]' : 'bg-white/[0.06] text-paper/50')}>
        {done === checks.length ? 'Ready to submit SQL' : `Checking ${done}/${checks.length}…`}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </Glass>
  );
}

/* ---------- 2. Deal: live MRR with a drawing sparkline and stage track ---------- */
export function DealCard() {
  const reduce = useReducedMotion();
  const [mrr, setMrr] = useState(5.0);
  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setMrr((v) => (v >= 6.4 ? 5.0 : +(v + 0.2).toFixed(1))), 1400);
    return () => window.clearInterval(t);
  }, [reduce]);
  const stages = ['SQL', 'L1', 'L2', 'L3', 'Won'];
  const spark = 'M0 34 C 14 30, 22 20, 36 24 S 58 10, 72 14 S 96 4, 120 6';
  return (
    <Glass className="w-[250px]" delay={2.3}>
      <div className="flex items-center justify-between">
        <Label>Kestrel Fintech</Label>
        <span className="flex items-center gap-1 rounded-full bg-brand-mint/15 px-2 py-0.5 text-[10px] font-semibold text-brand-mint">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-mint motion-safe:animate-pulse" />Hot
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10.5px] text-paper/45">Expected MRR</p>
          <p className="font-display text-[26px] font-medium leading-none tabular-nums">
            ₹<AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={mrr} className="inline-block" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.35 }}>{mrr.toFixed(1)}</motion.span>
            </AnimatePresence>L
          </p>
        </div>
        <svg viewBox="0 0 120 40" className="h-10 w-[104px] overflow-visible">
          <defs><linearGradient id="hc-spark" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#23B24A" stopOpacity=".4" /><stop offset="1" stopColor="#23B24A" stopOpacity="0" /></linearGradient></defs>
          <path d={`${spark} L120 40 L0 40Z`} fill="url(#hc-spark)" />
          <motion.path d={spark} fill="none" stroke="#23B24A" strokeWidth="2" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 1.8, ease: ease.out }} />
          <circle cx="120" cy="6" r="3" fill="#23B24A" className="motion-safe:animate-ping" style={{ transformOrigin: '120px 6px' }} />
          <circle cx="120" cy="6" r="2.5" fill="#23B24A" />
        </svg>
      </div>
      <div className="mt-3.5 flex gap-1">
        {stages.map((s, i) => (
          <div key={s} className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-forest-600 to-brand-mint" initial={{ width: 0 }}
                animate={{ width: i < 3 ? '100%' : i === 3 ? '45%' : '0%' }} transition={{ duration: 0.8, delay: 2 + i * 0.25, ease: ease.out }} />
            </div>
            <p className={cn('mt-1 text-center text-[9.5px]', i === 3 ? 'font-semibold text-brand-mint' : 'text-paper/40')}>{s}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1 text-[10.5px] text-paper/55"><TrendingUp className="h-3 w-3 text-brand-mint" />L3 with CFO booked · closes in 9 days</p>
    </Glass>
  );
}

/* ---------- 3. Live call: running timer, voice waveform, auto-created follow-up ---------- */
export function CallCard() {
  const reduce = useReducedMotion();
  const [sec, setSec] = useState(74);
  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setSec((s) => (s >= 240 ? 74 : s + 1)), 1000);
    return () => window.clearInterval(t);
  }, [reduce]);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0'), ss = String(sec % 60).padStart(2, '0');
  return (
    <Glass className="w-[270px]" delay={4.6}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-brand-mint/40 motion-safe:animate-ping" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-paper font-display text-[13px] font-bold text-brand-forest">RM</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold">Rahul Mehta</p>
          <p className="truncate text-[11px] text-paper/50">CFO · Northwind Logistics</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-brand-mint/15 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-brand-mint">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-mint" />{mm}:{ss}
        </span>
      </div>
      {/* waveform */}
      <div className="mt-3 flex h-8 items-center gap-[3px] rounded-xl bg-white/[0.04] px-2.5" aria-hidden>
        <Mic className="mr-1 h-3.5 w-3.5 shrink-0 text-paper/50" />
        {Array.from({ length: 26 }).map((_, i) => (
          <span key={i} className="w-[3px] flex-1 origin-center rounded-full bg-gradient-to-t from-brand-mint/50 to-brand-mint motion-safe:animate-[wave_1.1s_ease-in-out_infinite]"
            style={{ height: `${30 + ((i * 37) % 60)}%`, animationDelay: `${(i % 7) * 0.12}s` }} />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand-mint/30 bg-brand-mint/10 px-3 py-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-mint text-brand-night"><Check className="h-3 w-3" strokeWidth={3} /></span>
        <p className="text-[11.5px] leading-4"><span className="font-semibold">L1 booked</span> <span className="text-paper/55">· Thu 11:00 · follow-up set</span></p>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        {['Interested', 'Decision maker', 'Q1 budget'].map((t) => <span key={t} className="whitespace-nowrap rounded-full border border-white/10 px-2 py-0.5 text-[10px] leading-4 text-paper/60">{t}</span>)}
        <PhoneCall className="ml-auto h-3.5 w-3.5 self-center text-paper/40" />
      </div>
    </Glass>
  );
}
