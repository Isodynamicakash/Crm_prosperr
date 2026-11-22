import { useRef, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Building2, CalendarClock, Globe, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ease } from '@/lib/animations';
import { CountUp, Reveal } from '@/lib/animations/components';
import { MEDIA, type MediaClip } from '@/lib/media/manifest';
import { TopoLines, TopoSurface } from '@/components/brand/TopoLines';
import { CinematicMedia } from './CinematicMedia';
import { TiltCard } from './Brand3D';

/* ------------------------------------------------------------------ tile shell */

function Tile({ i, show, title, body, clip, className, children }: { i: number; show: boolean; title: string; body: string; clip: MediaClip; className?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const hasVideo = !!(clip.sources.desktop || clip.poster);
  return (
    <motion.div className={cn('h-full', className)}
      initial={{ clipPath: reduce ? 'inset(0% 0% 0% 0% round 30px)' : 'inset(100% 0% 0% 0% round 30px)' }}
      animate={show ? { clipPath: 'inset(0% 0% 0% 0% round 30px)' } : undefined}
      transition={{ duration: 1.1, delay: i * 0.12, ease: ease.inOut }}>
      <TiltCard max={6} className="group h-full overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#1A1D1A]">
        <TopoLines pattern={i % 2 ? 'b' : 'a'} levels={10} className="opacity-60" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-mint/0 blur-3xl transition-colors duration-700 group-hover:bg-brand-mint/20" />
        {hasVideo ? <CinematicMedia clip={clip} className="absolute inset-0" /> : (
          <div className="absolute inset-x-0 top-0 bottom-[84px] flex items-center justify-center p-6 [transform:translateZ(40px)]">{children}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-[#141614] via-[#141614]/90 to-transparent px-6 pb-5 pt-10">
          <div>
            <p className="font-display text-[21px] font-medium tracking-[-0.02em] text-paper">{title}</p>
            <p className="mt-0.5 text-[13.5px] text-paper/55">{body}</p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-paper/70 transition-all duration-300 group-hover:border-brand-mint group-hover:bg-brand-mint group-hover:text-brand-night">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </TiltCard>
    </motion.div>
  );
}

const glass = 'rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md';

/* ------------------------------------------------------------------ scenes */

function ResearchScene({ show }: { show: boolean }) {
  const people = [['CFO', 'Finance', 18, 34, 'CF'], ['CHRO', 'People', 74, 30, 'CH'], ['Head of Payroll', 'HR Ops', 46, 78, 'HP']] as const;
  return (
    <div className="w-full max-w-[340px] space-y-3">
      <div className={cn(glass, 'p-4')}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-mint/15 text-brand-mint"><Building2 className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-paper">Northwind Logistics</p>
            <p className="flex items-center gap-1 text-[11.5px] text-paper/50"><Globe className="h-3 w-3" />northwind.in · 1,200 employees</p>
          </div>
          {/* ICP score ring */}
          <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
            <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="4" />
            <motion.circle cx="20" cy="20" r="16" fill="none" stroke="#23B24A" strokeWidth="4" strokeLinecap="round" pathLength={1}
              initial={{ pathLength: 0 }} animate={show ? { pathLength: 0.86 } : undefined} transition={{ duration: 1.6, delay: 0.6, ease: ease.out }} />
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['Logistics', 'Tier-1 city', 'Fits ICP'].map((t) => <span key={t} className="rounded-full border border-white/10 px-2 py-0.5 text-[10.5px] text-paper/70">{t}</span>)}
        </div>
      </div>
      {/* stakeholder map */}
      <div className={cn(glass, 'relative h-[170px]')}>
        <p className="absolute left-4 top-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-paper/45">Stakeholder map</p>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {[[18, 34, 46, 78], [74, 30, 46, 78], [18, 34, 74, 30]].map(([a, b, c, d], k) => (
            <motion.line key={k} x1={a} y1={b} x2={c} y2={d} stroke="rgba(35,178,74,.7)" strokeWidth="1.4" strokeDasharray="2 2" vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }} animate={show ? { pathLength: 1 } : undefined} transition={{ duration: 1, delay: 0.8 + k * 0.2 }} />
          ))}
        </svg>
        {people.map(([r, f, x, y, ini], k) => (
          <motion.div key={r} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${x}%`, top: `${y}%` }}
            initial={{ opacity: 0, scale: 0.6 }} animate={show ? { opacity: 1, scale: 1 } : undefined} transition={{ delay: 1 + k * 0.15, duration: 0.5, ease: ease.out }}>
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-paper text-[10px] font-bold text-brand-forest ring-4 ring-brand-mint/20">{ini}</span>
            <span className="mt-1 block whitespace-nowrap text-[10.5px] font-medium text-paper">{r}</span>
            <span className="block text-[9.5px] text-paper/45">{f}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DataScene({ show }: { show: boolean }) {
  const reduce = useReducedMotion();
  const line = 'M0 120 C 60 112, 90 80, 150 86 S 250 40, 310 52 S 420 20, 480 30 S 560 8, 600 12';
  return (
    <div className="flex h-full w-full flex-col justify-center gap-4">
      <div className="flex flex-wrap gap-2">
        {[['Contacts mined', 1284, ''], ['Connect rate', 32, '%'], ['SQLs this month', 46, '']].map(([l, v, s]) => (
          <div key={l as string} className={cn(glass, 'px-3.5 py-2')}>
            <p className="text-[10.5px] text-paper/50">{l}</p>
            <p className="font-display text-[20px] font-medium leading-tight text-paper">{show ? <CountUp to={v as number} suffix={s as string} /> : 0}</p>
          </div>
        ))}
        <span className="ml-auto self-start rounded-full bg-brand-mint/15 px-2.5 py-1 text-[11px] font-semibold text-brand-mint"><TrendingUp className="mr-1 inline h-3 w-3" />+24% vs last month</span>
      </div>
      <div className="relative h-[120px] w-full">
        <svg viewBox="0 0 600 140" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id="vs-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#23B24A" stopOpacity=".35" /><stop offset="1" stopColor="#23B24A" stopOpacity="0" /></linearGradient>
            <linearGradient id="vs-line" x1="0" x2="1"><stop offset="0" stopColor="#5FA9B5" /><stop offset="1" stopColor="#6BCB82" /></linearGradient>
          </defs>
          {[35, 70, 105].map((y) => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="rgba(255,255,255,.06)" strokeDasharray="3 6" />)}
          <motion.path d={`${line} L600 140 L0 140Z`} fill="url(#vs-area)" initial={{ opacity: 0 }} animate={show ? { opacity: 1 } : undefined} transition={{ delay: 1.2, duration: 1 }} />
          <motion.path d={line} fill="none" stroke="url(#vs-line)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }} animate={show ? { pathLength: 1 } : undefined} transition={{ duration: 1.8, delay: 0.4, ease: ease.out }} />
        </svg>
        {!reduce && show && (
          <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-mint shadow-[0_0_0_6px_rgba(35,178,74,.2),0_0_24px_4px_rgba(35,178,74,.6)]"
            style={{ offsetPath: `path("${line}")`, offsetRotate: '0deg', animation: 'vs-travel 6s ease-in-out 2.2s infinite' } as React.CSSProperties} />
        )}
      </div>
    </div>
  );
}

function MeetingScene({ show }: { show: boolean }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const slots: [number, string, string][] = [[0, 'L1', 'Kestrel'], [1, 'L2', 'Northwind'], [3, 'L1', 'Orbit Pay'], [3, 'L3', 'Kestrel'], [4, 'L2', 'Lumen']];
  return (
    <div className="w-full max-w-[300px]">
      <div className="grid grid-cols-5 gap-1.5">
        {days.map((d, i) => (
          <div key={d} className={cn('rounded-xl border p-1.5 text-center', i === 3 ? 'border-brand-mint/50 bg-brand-mint/10' : 'border-white/[0.08] bg-white/[0.03]')}>
            <p className="text-[9.5px] text-paper/50">{d}</p>
            <div className="mt-1 space-y-1">
              {slots.filter(([day]) => day === i).map(([, l, c], k) => (
                <motion.span key={k} initial={{ opacity: 0, y: 6 }} animate={show ? { opacity: 1, y: 0 } : undefined} transition={{ delay: 0.7 + (i + k) * 0.1 }}
                  className={cn('block rounded-md px-0.5 py-1 text-[9px] font-semibold', l === 'L3' ? 'bg-brand-mint text-brand-night' : l === 'L2' ? 'bg-[#5FA9B5]/30 text-paper' : 'bg-white/10 text-paper/80')}>
                  {l}<span className="block font-normal opacity-70">{c}</span>
                </motion.span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={cn(glass, 'mt-3 flex items-center gap-2.5 px-3 py-2.5')}>
        <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-brand-mint opacity-70" /><span className="relative h-2 w-2 rounded-full bg-brand-mint" /></span>
        <CalendarClock className="h-3.5 w-3.5 text-paper/60" />
        <p className="text-[11.5px] text-paper/80">Next: <span className="font-semibold text-paper">L3 · Kestrel Fintech</span> · 11:00</p>
      </div>
    </div>
  );
}

function AnalyticsScene({ show }: { show: boolean }) {
  const bars = [32, 44, 40, 56, 64, 60, 78, 94];
  return (
    <div className="w-full max-w-[300px]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10.5px] text-paper/50">Expected MRR</p>
          <p className="font-display text-[28px] font-medium leading-none text-paper">₹{show ? <CountUp to={42.6} decimals={1} /> : 0}L</p>
        </div>
        <span className="rounded-full bg-brand-mint/15 px-2 py-0.5 text-[11px] font-semibold text-brand-mint">+18%</span>
      </div>
      <div className="mt-4 flex h-[110px] items-end gap-1.5">
        {bars.map((h, i) => (
          <motion.div key={i} className={cn('relative flex-1 origin-bottom rounded-t-lg', i === bars.length - 1
            ? 'bg-gradient-to-t from-brand-mint/40 to-brand-mint shadow-[0_0_24px_rgba(35,178,74,.55)]' : 'bg-gradient-to-t from-white/[0.04] to-white/25')}
            style={{ height: `${h}%` }} initial={{ scaleY: 0 }} animate={show ? { scaleY: 1 } : undefined}
            transition={{ duration: 0.9, delay: 0.5 + i * 0.07, ease: ease.out }}>
            {i === bars.length - 1 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-paper px-1.5 py-0.5 text-[9.5px] font-bold text-brand-forest">Won</span>}
          </motion.div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[9.5px] text-paper/40"><span>Apr</span><span>Nov</span></div>
    </div>
  );
}

/* ------------------------------------------------------------------ section */

export function VideoShowcase() {
  const grid = useRef<HTMLDivElement>(null);
  const show = useInView(grid, { once: true, amount: 0.15 });
  return (
    <section className="bg-canvas px-5 pb-16 lg:px-8 lg:pb-20">
      <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-[40px] px-5 py-14 text-paper sm:px-10 lg:py-16">
      <TopoSurface pattern="b" className="-z-20" />
      <div className="absolute left-1/2 top-0 -z-10 h-[360px] w-[900px] -translate-x-1/2 rounded-full bg-brand-mint/[0.10] blur-[120px]" />
      <div>
        <div className="grid items-end gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <p className="eyebrow-dark">In the field</p>
            <h2 className="mt-5 text-[38px] font-medium leading-[1.02] tracking-[-0.045em] sm:text-[56px]">Research, meetings and decisions, <span className="dim-dark">all feeding one system.</span></h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="text-[16px] leading-relaxed text-paper/65">Every call, meeting and stakeholder lands on the same account, so the numbers leadership sees are the work your team actually did.</p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-paper/45"><Sparkles className="h-3.5 w-3.5" />Illustrative sample data</p>
          </Reveal>
        </div>
        <div ref={grid} className="mt-10 grid gap-4 md:auto-rows-[300px] md:grid-cols-6">
          <Tile i={0} show={show} clip={MEDIA.research} title="Prospect research" body="Accounts, ICP fit and the people who decide." className="h-[440px] md:col-span-2 md:row-span-2 md:h-auto"><ResearchScene show={show} /></Tile>
          <Tile i={1} show={show} clip={MEDIA.data} title="Data intelligence" body="Mining and calling activity, live." className="h-[300px] md:col-span-4 md:h-auto"><DataScene show={show} /></Tile>
          <Tile i={2} show={show} clip={MEDIA.meeting} title="Sales meetings" body="L1 to L3, booked and recorded." className="h-[320px] md:col-span-2 md:h-auto"><MeetingScene show={show} /></Tile>
          <Tile i={3} show={show} clip={MEDIA.growth} title="Executive analytics" body="Pipeline and expected MRR by month." className="h-[320px] md:col-span-2 md:h-auto"><AnalyticsScene show={show} /></Tile>
        </div>
      </div>
      </div>
    </section>
  );
}
