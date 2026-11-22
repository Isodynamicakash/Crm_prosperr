import { motion } from 'motion/react';
import { Activity, BarChart3, CalendarClock, Database, FileBarChart, KanbanSquare, Lock, Users, UsersRound } from 'lucide-react';
import { ease } from '@/lib/animations';
import { CountUp, Reveal, StaggerGroup, StaggerItem } from '@/lib/animations/components';

const FEATURES = [
  { icon: Database, title: 'Lead management', body: 'One record per company, duplicates blocked by domain, phone and email.' },
  { icon: Users, title: 'Contact mining', body: 'Stakeholders grouped by function with seniority mapped from their title.' },
  { icon: Lock, title: 'Role-based access', body: 'BDRs, AEs, managers and admins each see and edit only what they should.' },
  { icon: KanbanSquare, title: 'Sales pipeline', body: 'Kanban and table views, temperature, expected MRR and close dates.' },
  { icon: CalendarClock, title: 'Meeting management', body: 'L1–L3 booking, reschedules and outcomes that move the stage.' },
  { icon: Activity, title: 'Activity tracking', body: 'Calls, emails, WhatsApp and notes on one timeline per account.' },
  { icon: BarChart3, title: 'Performance analytics', body: 'Targets, conversion and time in stage for every rep.' },
  { icon: UsersRound, title: 'Team collaboration', body: 'Hand-offs, referrals and notifications with full history.' },
  { icon: FileBarChart, title: 'Reporting', body: 'Exportable reports from contacts mined through to won.' },
];

/** Facts about the product itself, never customer outcomes. */
const FACTS = [
  { to: 7, label: 'pipeline stages, SQL to Won' },
  { to: 4, label: 'ICP checks before every SQL' },
  { to: 5, label: 'roles with their own home screen' },
  { to: 56, label: 'designations mapped to seniority' },
];

export function Features() {
  return (
    <section id="features" className="bg-canvas py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand-forest-600">Features</p>
          <h2 className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[48px]">Everything a B2B sales team needs, nothing it doesn’t.</h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-6 border-y border-line py-8 lg:grid-cols-4">
          {FACTS.map((f) => (
            <Reveal key={f.label}>
              <p className="text-[44px] font-semibold leading-none tracking-tight text-brand-forest"><CountUp to={f.to} /></p>
              <p className="mt-2 text-[13.5px] text-ink-muted">{f.label}</p>
            </Reveal>
          ))}
        </div>

        <StaggerGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.05}>
          {FEATURES.map((f) => (
            <StaggerItem key={f.title}>
              <motion.div whileHover="hover" initial="rest" animate="rest"
                className="group relative h-full overflow-hidden rounded-3xl border border-line bg-white p-6 transition-shadow duration-300 hover:shadow-[0_20px_50px_-24px_rgba(6,63,26,.35)]">
                <div className="relative h-11 w-11">
                  <motion.span variants={{ rest: { scale: 1, rotate: 0 }, hover: { scale: 0.6, rotate: -20, opacity: 0 } }} transition={{ duration: 0.3, ease: ease.out }}
                    className="absolute inset-0 flex items-center justify-center rounded-2xl bg-brand-forest-50 text-brand-forest"><f.icon className="h-5 w-5" /></motion.span>
                  <motion.span variants={{ rest: { scale: 0.6, rotate: 20, opacity: 0 }, hover: { scale: 1, rotate: 0, opacity: 1 } }} transition={{ duration: 0.3, ease: ease.out }}
                    className="absolute inset-0 flex items-center justify-center rounded-2xl bg-brand-forest text-brand-lime"><f.icon className="h-5 w-5" /></motion.span>
                </div>
                <p className="mt-5 text-[17px] font-semibold tracking-tight">{f.title}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{f.body}</p>
                <motion.span variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }} transition={{ duration: 0.45, ease: ease.out }}
                  className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-gradient-to-r from-brand-forest to-brand-lime" />
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
