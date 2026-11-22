import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { BarChart3, Building2, CalendarClock, Gauge, KanbanSquare, PhoneCall, PieChart } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ease } from '@/lib/animations';
import { Reveal } from '@/lib/animations/components';
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
    <section id="product" className="relative bg-white">
      <div className="mx-auto max-w-7xl px-5 pt-24 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand-forest-600">The product</p>
          <h2 className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[48px]">Built around how your sales team actually works.</h2>
        </Reveal>
      </div>

      <div ref={track} className="relative lg:h-[420vh]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:sticky lg:top-0 lg:h-screen lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8 lg:py-0">
          <ol className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0" role="tablist" aria-label="Product screens">
            {SCREENS.map((s, i) => (
              <li key={s.key} className="shrink-0">
                <button role="tab" aria-selected={i === active} onClick={() => jump(i)}
                  className={cn('group relative w-full rounded-2xl px-4 py-3 text-left transition-colors lg:py-3.5', i === active ? 'bg-brand-forest-50' : 'hover:bg-canvas')}>
                  {i === active && <motion.span layoutId="showcase-bar" className="absolute inset-y-3 left-0 hidden w-[3px] rounded-full bg-brand-forest lg:block" />}
                  <span className="flex items-center gap-3">
                    <s.icon className={cn('h-[18px] w-[18px] transition-colors', i === active ? 'text-brand-forest' : 'text-ink-muted')} />
                    <span className={cn('whitespace-nowrap text-[15px] font-semibold', i === active ? 'text-ink' : 'text-ink-soft')}>{s.title}</span>
                  </span>
                  <AnimatePresence initial={false}>
                    {i === active && (
                      <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: ease.out }} className="hidden overflow-hidden pl-[30px] text-[13.5px] leading-relaxed text-ink-muted lg:block">
                        <span className="block pt-1.5">{s.body}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </button>
              </li>
            ))}
          </ol>

          <div className="relative [perspective:1600px]">
            <div className="absolute -inset-10 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_60%_40%,rgba(139,195,74,.22),transparent_70%)]" />
            <p className="mb-3 text-[14px] text-ink-muted lg:hidden">{SCREENS[active].body}</p>
            <motion.div style={{ rotateX: tilt }} className="[transform-style:preserve-3d]">
              <AnimatePresence mode="wait">
                <motion.div key={SCREENS[active].key}
                  initial={{ opacity: 0, y: reduce ? 0 : 30, rotateY: reduce ? 0 : -8, scale: reduce ? 1 : 0.97 }}
                  animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, y: reduce ? 0 : -20, rotateY: reduce ? 0 : 6, scale: reduce ? 1 : 0.98 }}
                  transition={{ duration: 0.55, ease: ease.out }}>
                  <Current />
                </motion.div>
              </AnimatePresence>
            </motion.div>
            <div className="mt-5 hidden gap-1.5 lg:flex" aria-hidden>
              {SCREENS.map((s, i) => <span key={s.key} className={cn('h-1 flex-1 rounded-full transition-colors duration-500', i <= active ? 'bg-brand-forest' : 'bg-line')} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
