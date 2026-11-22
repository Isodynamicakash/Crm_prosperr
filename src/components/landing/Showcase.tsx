import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { BarChart3, Building2, CalendarClock, Gauge, KanbanSquare, PhoneCall, PieChart } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ease } from '@/lib/animations';
import { TopoSurface } from '@/components/brand/TopoLines';
import { AccountsPreview, AnalyticsPreview, DashboardPreview, MeetingsPreview, MyDayPreview, PipelinePreview, ReportsPreview } from './previews';

const SCREENS = [
  { key: 'dash', icon: Gauge, title: 'Dashboard overview', body: 'Each role lands on what matters today: targets, overdue outcomes and what needs review.', View: DashboardPreview },
  { key: 'accounts', icon: Building2, title: 'Lead management', body: 'Every company once, with saved views, filters and owners. Duplicates are caught at entry.', View: AccountsPreview },
  { key: 'bdr', icon: PhoneCall, title: 'BDR workflow', body: 'A ranked call queue. Logging an outcome sets the next follow-up for you.', View: MyDayPreview },
  { key: 'ae', icon: KanbanSquare, title: 'AE opportunities', body: 'A pipeline that moves when meetings are recorded, with stage requirements built in.', View: PipelinePreview },
  { key: 'meetings', icon: CalendarClock, title: 'Meeting management', body: 'Book, reschedule and record L1–L3 outcomes. Past times are blocked.', View: MeetingsPreview },
  { key: 'analytics', icon: BarChart3, title: 'Sales manager analytics', body: 'Target attainment and time-in-stage per person, live.', View: AnalyticsPreview },
  { key: 'reports', icon: PieChart, title: 'Leadership reports', body: 'From contacts mined to deals won, with expected MRR.', View: ReportsPreview },
];

export function Showcase() {
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => window.innerWidth >= 1024 && setActive(Math.min(SCREENS.length - 1, Math.max(0, Math.floor(v * SCREENS.length)))));
  const tilt = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [8, -8]);

  const jump = (i: number) => {
    const el = track.current;
    if (!el || window.innerWidth < 1024) { setActive(i); return; }
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((i + 0.5) / SCREENS.length), behavior: reduce ? 'auto' : 'smooth' });
  };
  const Current = SCREENS[active].View;

  return (
    <section id="product" className="relative bg-canvas pt-4 lg:pt-0">
      <div ref={track} className="relative lg:h-[420vh]">
        <div className="px-5 lg:sticky lg:top-0 lg:h-screen lg:px-8 lg:pb-6 lg:pt-[88px]">
          <div className="relative isolate mx-auto grid max-w-7xl gap-8 overflow-hidden rounded-[32px] px-5 py-10 text-paper sm:px-8 lg:h-full lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-12 lg:rounded-[40px] lg:px-12 lg:py-0">
            <TopoSurface pattern="b" className="-z-20" />
            <div className="absolute right-[10%] top-1/2 -z-10 h-[560px] w-[680px] -translate-y-1/2 rounded-full bg-brand-mint/[0.13] blur-[130px]" />

            <div className="min-w-0">
              <p className="eyebrow-dark">The product</p>
              <h2 className="mt-4 text-[34px] font-medium leading-[1.02] tracking-[-0.045em] lg:text-[44px]">Built around how your team <span className="dim-dark">actually works.</span></h2>
              <ol className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0" role="tablist" aria-label="Product screens">
                {SCREENS.map((s, i) => (
                  <li key={s.key} className="shrink-0">
                    <button role="tab" aria-selected={i === active} onClick={() => jump(i)}
                      className={cn('group relative w-full rounded-2xl px-4 py-2.5 text-left transition-colors lg:py-3',
                        i === active ? 'bg-white/[0.07] ring-1 ring-white/10 backdrop-blur' : 'hover:bg-white/[0.04]')}>
                      {i === active && <motion.span layoutId="showcase-bar" className="absolute inset-y-3 left-0 hidden w-[3px] rounded-full bg-brand-mint shadow-[0_0_12px_rgba(35,178,74,.8)] lg:block" />}
                      <span className="flex items-center gap-3">
                        <s.icon className={cn('h-[18px] w-[18px] transition-colors', i === active ? 'text-brand-mint' : 'text-paper/45')} />
                        <span className={cn('whitespace-nowrap text-[15px] font-semibold', i === active ? 'text-paper' : 'text-paper/60')}>{s.title}</span>
                        <span className={cn('ml-auto hidden font-mono text-[11px] tabular-nums lg:inline', i === active ? 'text-brand-mint' : 'text-paper/30')}>0{i + 1}</span>
                      </span>
                      <AnimatePresence initial={false}>
                        {i === active && (
                          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: ease.out }} className="hidden overflow-hidden pl-[30px] text-[13.5px] leading-relaxed text-paper/60 lg:block">
                            <span className="block pt-1.5">{s.body}</span>
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            <div className="relative min-w-0 [perspective:1600px]">
              <p className="mb-3 text-[14px] text-paper/60 lg:hidden">{SCREENS[active].body}</p>
              <motion.div style={{ rotateX: tilt }} className="[transform-style:preserve-3d]">
                <AnimatePresence mode="wait">
                  <motion.div key={SCREENS[active].key}
                    initial={{ opacity: 0, y: reduce ? 0 : 30, rotateY: reduce ? 0 : -8, scale: reduce ? 1 : 0.97 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
                    exit={{ opacity: 0, y: reduce ? 0 : -20, rotateY: reduce ? 0 : 6, scale: reduce ? 1 : 0.98 }}
                    transition={{ duration: 0.55, ease: ease.out }}
                    className="rounded-[22px] shadow-[0_50px_100px_-30px_rgba(0,0,0,.8),0_0_60px_-10px_rgba(35,178,74,.25)]">
                    <Current />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
              <div className="mt-5 hidden items-center gap-1.5 lg:flex" aria-hidden>
                {SCREENS.map((s, i) => <span key={s.key} className={cn('h-1 flex-1 rounded-full transition-colors duration-500', i <= active ? 'bg-brand-mint' : 'bg-white/10')} />)}
                <span className="ml-3 font-mono text-[11px] tabular-nums text-paper/50">{String(active + 1).padStart(2, '0')} / {String(SCREENS.length).padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
