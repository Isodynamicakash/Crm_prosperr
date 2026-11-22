import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { CalendarCheck2, ClipboardCheck, Database, PhoneCall, Target, Trophy, UserCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ease } from '@/lib/animations';
import { Reveal } from '@/lib/animations/components';

const STEPS = [
  { icon: Database, title: 'Contact Mining', who: 'BDR', body: 'Accounts and stakeholders are added once. Designations map to L1–L5 automatically.' },
  { icon: PhoneCall, title: 'BDR Calling', who: 'BDR', body: 'Every call outcome sets the next follow-up and moves the stakeholder status.' },
  { icon: ClipboardCheck, title: 'SQL Qualification', who: 'BDR → Manager', body: 'BANT, licenses, location and right-stakeholder checks run live before submit.' },
  { icon: UserCheck, title: 'AE Assignment', who: 'Manager', body: 'The manager validates the SQL and assigns an AE, with capacity shown.' },
  { icon: CalendarCheck2, title: 'Sales Meetings', who: 'AE', body: 'L1, L2 and L3 meetings are booked, rescheduled and recorded in one place.' },
  { icon: Target, title: 'Opportunity', who: 'AE', body: 'Stage requirements and exit steps decide when the deal moves forward.' },
  { icon: Trophy, title: 'Closed Won', who: 'AE', body: 'Won deals move to implementation with the full history attached.' },
];

function Burst() {
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <motion.span key={i} className="absolute h-1.5 w-1.5 rounded-full bg-brand-lime"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: Math.cos(a) * 46, y: Math.sin(a) * 46, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.9, ease: ease.out }} />
        );
      })}
    </span>
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

  return (
    <section id="workflow" className="relative bg-canvas">
      {/* desktop: sticky, scroll-driven */}
      <div ref={ref} className="relative hidden lg:block lg:h-[260vh]">
        <div className="sticky top-0 flex h-screen flex-col justify-center">
          <div className="mx-auto w-full max-w-7xl px-8">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand-forest-600">The workflow</p>
            <h2 className="mt-3 max-w-3xl text-[48px] font-semibold leading-[1.05] tracking-[-0.03em]">From a name on a list to a signed deal.</h2>

            <div className="relative mt-20">
              {/* track */}
              <div className="absolute left-[calc(100%/14)] right-[calc(100%/14)] top-7 h-[3px] rounded-full bg-line" />
              <motion.div className="absolute left-[calc(100%/14)] right-[calc(100%/14)] top-7 h-[3px] origin-left rounded-full bg-gradient-to-r from-brand-forest via-brand-forest-600 to-brand-lime"
                style={{ scaleX: reduce ? 1 : progress }} />
              {/* moving lead card */}
              <div className="pointer-events-none absolute left-[calc(100%/14)] right-[calc(100%/14)] -top-12 h-10">
                <motion.div style={{ left: reduce ? '100%' : cardLeft }} className="absolute -translate-x-1/2">
                  <div className="whitespace-nowrap rounded-full bg-brand-charcoal px-3 py-1 text-[11px] font-medium text-white shadow-pop">
                    Northwind Logistics · <span className="text-brand-lime">{STEPS[reached].title}</span>
                  </div>
                </motion.div>
              </div>

              <ol className="relative grid grid-cols-7">
                {STEPS.map((s, i) => {
                  const on = i <= reached;
                  return (
                    <li key={s.title} className="relative flex flex-col items-center text-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                      <motion.span animate={{ scale: i === reached && !reduce ? 1.12 : 1 }} transition={{ duration: 0.4, ease: ease.out }}
                        className={cn('relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-colors duration-500',
                          on ? 'border-brand-forest bg-brand-forest text-brand-lime shadow-[0_10px_30px_-10px_rgba(6,63,26,.6)]' : 'border-line bg-white text-ink-muted')}>
                        <s.icon className="h-6 w-6" />
                        {i === STEPS.length - 1 && won && !reduce && <Burst key="burst" />}
                      </motion.span>
                      <p className={cn('mt-4 text-[14px] font-semibold transition-colors', on ? 'text-ink' : 'text-ink-muted')}>{s.title}</p>
                      <p className="text-[11.5px] text-ink-muted">{s.who}</p>
                      <motion.div initial={false} animate={{ opacity: hover === i ? 1 : 0, y: hover === i ? 0 : 6 }} transition={{ duration: 0.2 }}
                        className="pointer-events-none absolute top-[118px] z-10 w-52 rounded-xl border border-line bg-white p-3 text-left text-[12.5px] leading-relaxed text-ink-soft shadow-pop">
                        {s.body}
                      </motion.div>
                    </li>
                  );
                })}
              </ol>
            </div>
            <p className="mt-28 text-center text-[13px] text-ink-muted">Hover a stage to see what happens there.</p>
          </div>
        </div>
      </div>

      {/* mobile: vertical timeline */}
      <div className="mx-auto max-w-xl px-5 py-20 lg:hidden">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand-forest-600">The workflow</p>
          <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight">From a name on a list to a signed deal.</h2>
        </Reveal>
        <ol className="relative mt-8 space-y-6 border-l-2 border-brand-forest/20 pl-7">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.03}>
              <li className="relative">
                <span className="absolute -left-[45px] flex h-9 w-9 items-center justify-center rounded-xl bg-brand-forest text-brand-lime"><s.icon className="h-4 w-4" /></span>
                <p className="text-[15px] font-semibold">{s.title} <span className="text-[12px] font-normal text-ink-muted">· {s.who}</span></p>
                <p className="mt-1 text-[13.5px] text-ink-soft">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
