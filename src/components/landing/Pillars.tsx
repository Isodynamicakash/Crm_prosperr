import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { ease } from '@/lib/animations';
import { ArrowUpRight, KanbanSquare, PhoneCall, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { CountUp, Reveal, StaggerGroup, StaggerItem } from '@/lib/animations/components';
import { TiltCard } from './Brand3D';
import { TopoLines, TopoSurface } from '@/components/brand/TopoLines';
import { DEMO_URL } from './Hero';
import { Link } from 'react-router-dom';

const glass = 'rounded-xl border border-white/10 bg-[#101311]/85 backdrop-blur';

function QueueScene() {
  const rows = [['Priya S.', 'CFO · Northwind', true], ['Rahul M.', 'CHRO · Kestrel', false], ['Anita K.', 'Payroll · Orbit Pay', false]] as const;
  return (
    <div className="space-y-1.5">
      {rows.map(([n, r, hot], i) => (
        <motion.div key={n} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.12 }}
          className={cn(glass, 'flex items-center gap-2.5 px-2.5 py-1.5', hot && 'border-brand-mint/40 bg-brand-mint/10')}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper text-[9.5px] font-bold text-brand-forest">{n.split(' ').map((w) => w[0]).join('')}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[11.5px] font-semibold">{n}</span><span className="block truncate text-[10px] text-paper/50">{r}</span></span>
          {hot ? <span className="relative flex h-6 items-center gap-1 rounded-full bg-brand-mint px-2 text-[10px] font-bold text-brand-night"><span className="absolute inset-0 rounded-full bg-brand-mint/60 motion-safe:animate-ping" /><PhoneCall className="relative h-3 w-3" /><span className="relative">Call</span></span>
            : <span className="text-[10px] text-paper/40">{i === 1 ? '11:30' : '14:00'}</span>}
        </motion.div>
      ))}
    </div>
  );
}

function KanbanScene() {
  const reduce = useReducedMotion();
  const cols = ['L1', 'L2', 'L3'];
  return (
    <div className="relative grid h-full grid-cols-3 gap-1.5">
      {cols.map((c, i) => (
        <div key={c} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-1.5">
          <p className="mb-1.5 flex items-center justify-between px-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-paper/45">{c}<span>{[3, 2, 1][i]}</span></p>
          {Array.from({ length: [2, 1, 1][i] }).map((_, k) => <div key={k} className={cn(glass, 'mb-1.5 h-8 px-1.5 py-1')}><div className="h-1.5 w-3/4 rounded bg-white/20" /><div className="mt-1 h-1.5 w-1/2 rounded bg-white/10" /></div>)}
        </div>
      ))}
      {/* a deal moving L1 -> L2 -> L3 */}
      <motion.div className="absolute left-[3%] top-[52%] w-[30%] rounded-lg border border-brand-mint/50 bg-brand-mint/20 px-1.5 py-1 shadow-[0_0_20px_rgba(35,178,74,.45)] backdrop-blur"
        animate={reduce ? undefined : { left: ['3%', '36%', '69%', '69%', '3%'], opacity: [1, 1, 1, 1, 0] }} transition={{ duration: 6, times: [0, 0.3, 0.6, 0.9, 1], repeat: Infinity, ease: 'easeInOut' }}>
        <p className="truncate text-[9.5px] font-semibold text-paper">Kestrel · ₹5L</p>
      </motion.div>
    </div>
  );
}

function TargetScene() {
  const bars = [38, 52, 46, 64, 72, 88];
  return (
    <div className="flex h-full items-end gap-4">
      <div className="relative h-[92px] w-[92px] shrink-0">
        <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="4" />
          <motion.circle cx="22" cy="22" r="18" fill="none" stroke="#23B24A" strokeWidth="4" strokeLinecap="round" pathLength={1}
            initial={{ pathLength: 0 }} whileInView={{ pathLength: 0.82 }} viewport={{ once: true }} transition={{ duration: 1.6, delay: 0.3, ease: ease.out }}
            style={{ filter: 'drop-shadow(0 0 4px rgba(35,178,74,.8))' }} />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-display text-[20px] font-medium leading-none"><CountUp to={82} />%</span><span className="text-[9px] text-paper/50">of target</span></span>
      </div>
      <div className="flex h-full flex-1 items-end gap-1.5 pb-1">
        {bars.map((h, i) => (
          <motion.div key={i} className={cn('flex-1 origin-bottom rounded-t-md', i === bars.length - 1 ? 'bg-gradient-to-t from-brand-mint/40 to-brand-mint shadow-[0_0_16px_rgba(35,178,74,.55)]' : 'bg-gradient-to-t from-white/[0.04] to-white/25')}
            style={{ height: `${h}%` }} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.4 + i * 0.07, ease: ease.out }} />
        ))}
      </div>
    </div>
  );
}

const PILLARS = [
  { icon: PhoneCall, title: 'Prospecting', who: 'BDRs', chips: ['Contact mining', 'ICP checks', 'Call queue', 'Auto follow-ups', 'SQL submission'], Scene: QueueScene },
  { icon: KanbanSquare, title: 'Pipeline', who: 'Account Executives', chips: ['L1–L3 meetings', 'Kanban stages', 'Stage proof', 'Multithreading', 'Closed Won'], Scene: KanbanScene },
  { icon: TrendingUp, title: 'Performance', who: 'Managers & Leadership', chips: ['Targets vs actuals', 'Funnel', 'Expected MRR', 'Time in stage', 'AE capacity'], Scene: TargetScene },
];

const STAGES = ['Contact mined', 'ICP qualified', 'SQL submitted', 'SQL approved', 'L1 booked', 'L2 done', 'L3 done', 'Proposal sent', 'Closed Won'];

/** The prosperr.io "managed in one place" trio, applied to the sales team, with 3D tilt cards. */
export function Pillars() {
  const { user } = useAuth();
  return (
    <section id="pillars" className="relative overflow-hidden bg-canvas pb-16 pt-20 lg:pb-20 lg:pt-24">
      {/* running stage ticker */}
      <div className="absolute inset-x-0 top-0 overflow-hidden border-y border-black/5 bg-white py-3" aria-hidden>
        <div className="flex w-max motion-safe:animate-marquee">
          {[...STAGES, ...STAGES].map((s, i) => (
            <span key={i} className="flex items-center gap-3 px-5 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink/70">
              <span className={i % STAGES.length === STAGES.length - 1 ? 'text-brand-forest' : ''}>{s}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-[38px] font-medium leading-[1.02] tracking-[-0.045em] sm:text-[56px] lg:text-[64px]">
            Your prospects, pipeline and team, <span className="dim">managed in one place.</span>
          </h2>
        </Reveal>

        <StaggerGroup className="mt-10 grid gap-5 md:grid-cols-3" gap={0.1}>
          {PILLARS.map((p) => (
            <StaggerItem key={p.title}>
              <TiltCard max={8} className="group h-full overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#161916] p-3 text-paper shadow-[0_30px_60px_-30px_rgba(13,13,13,.55)] transition-[border-color,box-shadow] duration-300 hover:border-brand-mint/30 hover:shadow-[0_40px_80px_-30px_rgba(5,63,26,.6)]">
                <div className="relative h-[250px] overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#111411] preserve-3d">
                  <TopoLines levels={11} pattern={p.title === 'Pipeline' ? 'b' : 'a'} />
                  <div className="absolute left-1/2 top-1/2 h-48 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-mint/[0.12] opacity-70 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
                  <span className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-mint text-brand-night shadow-[0_0_24px_rgba(35,178,74,.5)]"><p.icon className="h-5 w-5" /></span>
                  <span className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-paper/80 backdrop-blur">{p.who}</span>
                  <div className="absolute inset-x-4 bottom-3 top-[64px] [transform:translateZ(40px)]"><p.Scene /></div>
                </div>
                <div className="px-3 pb-4 pt-6" style={{ transform: 'translateZ(30px)' }}>
                  <h3 className="font-display text-[30px] font-medium tracking-[-0.03em] text-paper">{p.title}</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.chips.map((c) => (
                      <span key={c} className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13.5px] font-medium text-paper/80 transition-colors hover:border-brand-mint/40 hover:bg-brand-mint/10 hover:text-paper">{c}</span>
                    ))}
                  </div>
                </div>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal delay={0.2}>
          <div className="relative isolate mt-5 flex flex-col items-start gap-5 overflow-hidden rounded-[32px] px-7 py-7 text-white sm:flex-row sm:items-center sm:rounded-full lg:px-10">
            <TopoSurface className="-z-20" />
            <div className="absolute -left-20 top-1/2 -z-10 h-48 w-[480px] -translate-y-1/2 rounded-full bg-brand-mint/20 blur-3xl" />
            <Sparkles className="relative h-10 w-10 shrink-0 fill-brand-mint text-brand-mint" />
            <p className="relative font-display text-[26px] font-medium tracking-[-0.04em] text-paper sm:text-[34px]">One CRM that <span className="dim-dark">runs all of this.</span></p>
            <div className="relative flex flex-wrap gap-3 sm:ml-auto">
              <Link to={user ? '/' : '/login'} className="group inline-flex h-12 items-center gap-2 rounded-full bg-brand-forest px-6 text-[16px] font-semibold text-white ring-[1.5px] ring-paper/80 transition-all hover:-translate-y-0.5 hover:bg-brand-forest-700">
                See it live <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <a href={DEMO_URL} className="inline-flex h-12 items-center rounded-full border-[1.5px] border-paper/70 px-6 text-[16px] font-semibold transition-colors hover:bg-white/10">Book a demo call</a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
