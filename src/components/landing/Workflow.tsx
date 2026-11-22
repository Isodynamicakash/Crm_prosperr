import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { CalendarCheck2, Check, ClipboardCheck, Database, PhoneCall, Target, Trophy, UserCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ease } from '@/lib/animations';
import { Reveal } from '@/lib/animations/components';
import { TopoSurface } from '@/components/brand/TopoLines';

const STEPS = [
  { icon: Database, title: 'Contact Mining', who: 'BDR', body: 'Accounts and stakeholders are added once. Designations map to L1–L5 automatically.', auto: ['Seniority mapped from title', 'Duplicates blocked at entry'] },
  { icon: PhoneCall, title: 'BDR Calling', who: 'BDR', body: 'Every call outcome sets the next follow-up and moves the stakeholder status.', auto: ['Next follow-up created', 'Stakeholder status updated'] },
  { icon: ClipboardCheck, title: 'SQL Qualification', who: 'BDR → Manager', body: 'BANT, licenses, location and right-stakeholder checks run live before submit.', auto: ['ICP checks run live', 'Manager notified on submit'] },
  { icon: UserCheck, title: 'AE Assignment', who: 'Manager', body: 'The manager validates the SQL and assigns an AE, with capacity shown.', auto: ['AE capacity shown', 'Owner and history carried over'] },
  { icon: CalendarCheck2, title: 'Sales Meetings', who: 'AE', body: 'L1, L2 and L3 meetings are booked, rescheduled and recorded in one place.', auto: ['Past times blocked', 'Stage moves on outcome'] },
  { icon: Target, title: 'Opportunity', who: 'AE', body: 'Stage requirements and exit steps decide when the deal moves forward.', auto: ['Exit criteria enforced', 'Expected MRR tracked'] },
  { icon: Trophy, title: 'Closed Won', who: 'AE', body: 'Won deals move to implementation with the full history attached.', auto: ['Hand-off to implementation', 'Team target updated'] },
];

function Burst() {
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <motion.span key={i} className="absolute h-1.5 w-1.5 rounded-full bg-brand-mint"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: Math.cos(a) * 52, y: Math.sin(a) * 52, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.9, ease: ease.out }} />
        );
      })}
    </span>
  );
}

/** Large panel for the stage in focus: what happens there and what the CRM does on its own. */
function Detail({ i }: { i: number }) {
  const s = STEPS[i];
  return (
    <AnimatePresence mode="wait">
      <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: ease.out }}
        className="grid items-center gap-6 rounded-[28px] border border-white/10 bg-[#101311]/80 p-6 backdrop-blur-xl md:grid-cols-[auto_1fr_auto] md:gap-10 md:p-8">
        <div className="flex items-center gap-4">
          <span className="font-display text-[64px] font-medium leading-none tracking-[-0.05em] text-brand-mint tabular-nums">0{i + 1}</span>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-mint text-brand-night shadow-[0_0_30px_rgba(35,178,74,.5)]"><s.icon className="h-6 w-6" /></span>
        </div>
        <div>
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[26px] font-medium tracking-[-0.03em] text-paper">{s.title}</span>
            <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11.5px] text-paper/70">{s.who}</span>
          </p>
          <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-paper/65">{s.body}</p>
        </div>
        <ul className="space-y-2">
          {s.auto.map((a, k) => (
            <motion.li key={a} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + k * 0.1 }}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-brand-mint/25 bg-brand-mint/10 px-3 py-2 text-[12.5px] text-paper">
              <Zap className="h-3.5 w-3.5 text-brand-mint" />{a}
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
}

export function Workflow() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const [reached, setReached] = useState(reduce ? STEPS.length - 1 : 0);
  useMotionValueEvent(progress, 'change', (v) => { if (!reduce) setReached(Math.min(STEPS.length - 1, Math.floor(v * (STEPS.length - 0.01) + 0.15))); });
  const cardLeft = useTransform(progress, [0, 1], ['0%', '100%']);
  const [hover, setHover] = useState<number | null>(null);
  const won = reached === STEPS.length - 1;
  const focus = hover ?? reached;

  return (
    <section id="workflow" className="relative bg-canvas">
      {/* desktop: sticky, scroll-driven, on a dark stage */}
      <div ref={ref} className="relative hidden lg:block lg:h-[260vh]">
        <div className="sticky top-0 h-screen px-8 pb-6 pt-[88px]">
          <div className="relative isolate mx-auto flex h-full max-w-7xl flex-col justify-center overflow-hidden rounded-[40px] px-12 text-paper">
            <TopoSurface className="-z-20" />
            <div className="absolute left-1/2 top-[55%] -z-10 h-[420px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-mint/[0.10] blur-[120px]" />

            <div className="flex items-end justify-between gap-8">
              <div>
                <p className="eyebrow-dark">The workflow</p>
                <h2 className="mt-4 max-w-3xl text-[48px] font-medium leading-[1.02] tracking-[-0.045em]">From a name on a list <span className="dim-dark">to a signed deal.</span></h2>
              </div>
              <p className="mb-2 shrink-0 font-mono text-[12px] uppercase tracking-[0.14em] text-paper/45">Stage <span className="text-brand-mint">{String(reached + 1).padStart(2, '0')}</span> / 07</p>
            </div>

            <div className="relative mt-16">
              {/* track */}
              <div className="absolute left-[calc(100%/14)] right-[calc(100%/14)] top-7 h-[3px] rounded-full bg-white/10" />
              <motion.div className="absolute left-[calc(100%/14)] right-[calc(100%/14)] top-7 h-[3px] origin-left rounded-full bg-gradient-to-r from-brand-forest-600 to-brand-mint shadow-[0_0_14px_rgba(35,178,74,.7)]"
                style={{ scaleX: reduce ? 1 : progress }} />
              {/* moving lead chip */}
              <div className="pointer-events-none absolute left-[calc(100%/14)] right-[calc(100%/14)] -top-12 h-10">
                <motion.div style={{ left: reduce ? '100%' : cardLeft }} className="absolute -translate-x-1/2">
                  <div className="whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11.5px] font-medium text-paper shadow-[0_10px_30px_-10px_rgba(0,0,0,.6)] backdrop-blur-md">
                    Northwind Logistics · <span className="text-brand-mint">{STEPS[reached].title}</span>
                  </div>
                </motion.div>
              </div>

              <ol className="relative grid grid-cols-7">
                {STEPS.map((s, i) => {
                  const on = i <= reached, current = i === focus;
                  return (
                    <li key={s.title} className="relative flex cursor-default flex-col items-center text-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                      <motion.span animate={{ scale: current && !reduce ? 1.14 : 1 }} transition={{ duration: 0.4, ease: ease.out }}
                        className={cn('relative flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors duration-500',
                          current ? 'border-brand-mint bg-brand-mint text-brand-night shadow-[0_0_30px_rgba(35,178,74,.6)]'
                            : on ? 'border-brand-mint/50 bg-brand-mint/15 text-brand-mint' : 'border-white/10 bg-white/[0.04] text-paper/40')}>
                        {on && !current ? <Check className="h-6 w-6" /> : <s.icon className="h-6 w-6" />}
                        {i === STEPS.length - 1 && won && !reduce && <Burst key="burst" />}
                      </motion.span>
                      <p className={cn('mt-4 text-[14px] font-semibold transition-colors', on ? 'text-paper' : 'text-paper/45')}>{s.title}</p>
                      <p className="text-[11.5px] text-paper/40">{s.who}</p>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-10"><Detail i={focus} /></div>
          </div>
        </div>
      </div>

      {/* mobile: vertical timeline on the same dark stage */}
      <div className="px-5 py-4 lg:hidden">
        <div className="relative isolate overflow-hidden rounded-[32px] px-6 py-10 text-paper">
          <TopoSurface className="-z-20" />
          <Reveal>
            <p className="eyebrow-dark">The workflow</p>
            <h2 className="mt-5 text-[34px] font-medium leading-[1.02] tracking-[-0.04em]">From a name on a list <span className="dim-dark">to a signed deal.</span></h2>
          </Reveal>
          <ol className="relative mt-8 space-y-6 border-l-2 border-brand-mint/30 pl-7">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.03}>
                <li className="relative">
                  <span className="absolute -left-[45px] flex h-9 w-9 items-center justify-center rounded-xl bg-brand-mint text-brand-night"><s.icon className="h-4 w-4" /></span>
                  <p className="text-[15px] font-semibold">{s.title} <span className="text-[12px] font-normal text-paper/50">· {s.who}</span></p>
                  <p className="mt-1 text-[13.5px] text-paper/65">{s.body}</p>
                  <p className="mt-2 flex flex-wrap gap-1.5">{s.auto.map((a) => <span key={a} className="rounded-full border border-brand-mint/25 bg-brand-mint/10 px-2 py-0.5 text-[11px] text-paper/85">{a}</span>)}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
