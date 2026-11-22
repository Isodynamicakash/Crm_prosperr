import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, Briefcase, Check, Crown, Headset, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ease } from '@/lib/animations';
import { CountUp, Reveal, StaggerGroup, StaggerItem } from '@/lib/animations/components';
import { TopoLines, TopoSurface } from '@/components/brand/TopoLines';
import { TiltCard } from './Brand3D';

const ROLES = [
  { icon: ShieldCheck, role: 'Admin', line: 'User management and role-based access.', home: 'Settings & access', stat: [5, 'roles configured'], details: ['Add users and assign roles', 'Field and action permissions per role', 'Dropdowns, cities, designations and stage rules without code'] },
  { icon: Headset, role: 'BDR', line: 'Contact mining, prospecting and qualification.', home: 'My Day', stat: [24, 'calls queued today'], details: ['Ranked daily call queue', 'One-click call outcomes with auto follow-ups', 'Live ICP checklist before submitting an SQL'] },
  { icon: Briefcase, role: 'Account Executive', line: 'Assigned opportunities, meetings and deals.', home: 'Pipeline', stat: [7, 'open opportunities'], details: ['Kanban pipeline that moves on meeting outcomes', 'Stage requirements with file or link proof', 'Reschedule, multithread or close in two clicks'] },
  { icon: BarChart3, role: 'Sales Manager', line: 'Team performance and pipeline management.', home: 'Team & SQL review', stat: [5, 'SQLs waiting review'], details: ['SQL review queue with approve, reject or assign', 'AE capacity when assigning', 'Overdue outcomes and stuck deals surfaced daily'] },
  { icon: Crown, role: 'Leadership', line: 'Revenue, forecasting and executive analytics.', home: 'Reports', stat: [82, '% of quarterly target'], details: ['Funnel from contacts mined to won', 'Expected MRR by stage and temperature', 'Targets versus actuals per team'] },
] as const;

export function Roles() {
  const [active, setActive] = useState(1);
  const r = ROLES[active];
  return (
    <section id="roles" className="bg-canvas py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="max-w-4xl">
          <p className="eyebrow">Built for every seat</p>
          <h2 className="mt-5 text-[38px] font-medium leading-[1.02] tracking-[-0.045em] sm:text-[60px]">Everyone sees their work, <span className="dim">and only theirs.</span></h2>
        </Reveal>

        {/* role picker: dark glass cards */}
        <StaggerGroup className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" gap={0.07}>
          {ROLES.map((x, i) => {
            const on = i === active;
            return (
              <StaggerItem key={x.role} className={cn(i === ROLES.length - 1 && 'col-span-2 sm:col-span-1')}>
                <TiltCard max={7} className="h-full rounded-[26px]">
                  <button type="button" onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} aria-pressed={on}
                    className={cn('relative flex h-full w-full flex-col overflow-hidden rounded-[26px] border p-5 text-left transition-all duration-300',
                      on ? 'border-brand-mint/50 bg-[#141814] shadow-[0_30px_60px_-24px_rgba(5,63,26,.7),0_0_0_1px_rgba(35,178,74,.25)]'
                        : 'border-white/[0.07] bg-[#1A1D1A] hover:border-white/20')}>
                    <TopoLines levels={8} pattern={i % 2 ? 'a' : 'b'} className={cn('transition-opacity duration-500', on ? 'opacity-70' : 'opacity-35')} />
                    <span className={cn('absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl transition-colors duration-500', on ? 'bg-brand-mint/30' : 'bg-transparent')} />
                    <span className="relative flex items-center justify-between">
                      <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300',
                        on ? 'bg-brand-mint text-brand-night shadow-[0_0_24px_rgba(35,178,74,.55)]' : 'border border-white/10 bg-white/[0.06] text-brand-mint')}>
                        <x.icon className="h-5 w-5" />
                      </span>
                      <span className={cn('font-mono text-[11px] tabular-nums', on ? 'text-brand-mint' : 'text-paper/30')}>0{i + 1}</span>
                    </span>
                    <span className="relative mt-5 block font-display text-[19px] font-medium tracking-[-0.02em] text-paper">{x.role}</span>
                    <span className="relative mt-1 block text-[13px] leading-relaxed text-paper/55">{x.line}</span>
                    <span className={cn('relative mt-auto flex items-center gap-1.5 pt-4 text-[11.5px] font-medium transition-colors', on ? 'text-brand-mint' : 'text-paper/40')}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', on ? 'bg-brand-mint' : 'bg-paper/30')} />Lands on {x.home}
                    </span>
                  </button>
                </TiltCard>
              </StaggerItem>
            );
          })}
        </StaggerGroup>

        {/* detail stage for the selected role */}
        <Reveal delay={0.1}>
          <div className="relative isolate mt-4 overflow-hidden rounded-[32px] text-paper">
            <TopoSurface pattern="b" className="-z-20" />
            <div className="absolute -left-20 top-1/2 -z-10 h-64 w-[520px] -translate-y-1/2 rounded-full bg-brand-mint/[0.12] blur-3xl" />
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                transition={{ duration: 0.4, ease: ease.out }} className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_1.3fr_auto] md:items-center md:gap-10 lg:p-10">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-mint text-brand-night shadow-[0_0_30px_rgba(35,178,74,.5)]"><r.icon className="h-6 w-6" /></span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/45">Home screen · {r.home}</p>
                    <p className="font-display text-[28px] font-medium leading-tight tracking-[-0.03em]">{r.role}</p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {r.details.map((d, k) => (
                    <motion.li key={d} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + k * 0.08, ease: ease.out }}
                      className="flex items-start gap-2.5 text-[14.5px] text-paper/80">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-mint/20 text-brand-mint"><Check className="h-3 w-3" strokeWidth={3} /></span>{d}
                    </motion.li>
                  ))}
                </ul>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-5 text-center backdrop-blur md:min-w-[170px]">
                  <p className="font-display text-[44px] font-medium leading-none tracking-[-0.04em] text-brand-mint"><CountUp to={r.stat[0]} /></p>
                  <p className="mt-1.5 text-[12px] text-paper/55">{r.stat[1]}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-paper/30">Sample data</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
