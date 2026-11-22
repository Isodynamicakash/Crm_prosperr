import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, Briefcase, ChevronDown, Crown, Headset, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ease } from '@/lib/animations';
import { Reveal, StaggerGroup, StaggerItem } from '@/lib/animations/components';

const ROLES = [
  { icon: ShieldCheck, role: 'Admin', line: 'User management and role-based access.', details: ['Add users and assign roles', 'Field and action permissions per role', 'Dropdowns, cities, designations and stage rules without code'] },
  { icon: Headset, role: 'BDR', line: 'Contact mining, prospecting and qualification.', details: ['Ranked daily call queue', 'One-click call outcomes with auto follow-ups', 'Live ICP checklist before submitting an SQL'] },
  { icon: Briefcase, role: 'Account Executive', line: 'Assigned opportunities, meetings and deals.', details: ['Kanban pipeline that moves on meeting outcomes', 'Stage requirements with file or link proof', 'Reschedule, multithread or close in two clicks'] },
  { icon: BarChart3, role: 'Sales Manager', line: 'Team performance and pipeline management.', details: ['SQL review queue with approve, reject or assign', 'AE capacity when assigning', 'Overdue outcomes and stuck deals surfaced daily'] },
  { icon: Crown, role: 'Leadership', line: 'Revenue, forecasting and executive analytics.', details: ['Funnel from contacts mined to won', 'Expected MRR by stage and temperature', 'Targets versus actuals per team'] },
];

export function Roles() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="roles" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand-forest-600">Built for every seat</p>
          <h2 className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[48px]">Everyone sees their work, and only theirs.</h2>
        </Reveal>
        <StaggerGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" gap={0.07}>
          {ROLES.map((r, i) => (
            <StaggerItem key={r.role}>
              <motion.button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
                whileHover={{ y: -6 }} transition={{ duration: 0.3, ease: ease.out }}
                className={cn('group relative h-full w-full overflow-hidden rounded-3xl border bg-white p-5 text-left transition-shadow duration-300',
                  open === i ? 'border-brand-forest shadow-glow' : 'border-line hover:shadow-[0_20px_50px_-20px_rgba(6,63,26,.35),0_0_0_1px_rgba(139,195,74,.35)]')}>
                <span className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-lime/0 blur-2xl transition-colors duration-500 group-hover:bg-brand-lime/30" />
                <motion.span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-forest text-brand-lime"
                  whileHover={{ rotate: [0, -10, 8, 0], scale: 1.06 }} transition={{ duration: 0.6 }}>
                  <r.icon className="h-5 w-5" />
                </motion.span>
                <p className="relative mt-5 text-[17px] font-semibold tracking-tight">{r.role}</p>
                <p className="relative mt-1 text-[13.5px] leading-relaxed text-ink-muted">{r.line}</p>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: ease.out }} className="relative overflow-hidden">
                      {r.details.map((d) => <li key={d} className="mt-2 flex gap-2 text-[13px] text-ink-soft first:mt-4"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-lime" />{d}</li>)}
                    </motion.ul>
                  )}
                </AnimatePresence>
                <span className="relative mt-4 flex items-center gap-1 text-[12.5px] font-semibold text-brand-forest-600">
                  {open === i ? 'Less' : 'What they get'}<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open === i && 'rotate-180')} />
                </span>
              </motion.button>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
