import { motion } from 'motion/react';
import { Activity, BarChart3, CalendarClock, Database, FileBarChart, KanbanSquare, Lock, Users, UsersRound } from 'lucide-react';
import { ease } from '@/lib/animations';
import { TopoLines } from '@/components/brand/TopoLines';
import { TiltCard } from './Brand3D';
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
    <section id="features" className="bg-canvas pb-16 lg:pb-20">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="max-w-4xl">
          <p className="eyebrow">Features</p>
          <h2 className="mt-5 text-[38px] font-medium leading-[1.02] tracking-[-0.045em] sm:text-[60px]">Everything a B2B sales team needs, <span className="dim">nothing it doesn’t.</span></h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-6 border-y border-line py-8 lg:grid-cols-4">
          {FACTS.map((f) => (
            <Reveal key={f.label}>
              <p className="font-display text-[64px] font-medium leading-none tracking-[-0.05em] text-ink"><CountUp to={f.to} /><span className="dim">.</span></p>
              <p className="mt-2 text-[13.5px] text-ink-muted">{f.label}</p>
            </Reveal>
          ))}
        </div>

        <StaggerGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.05}>
          {FEATURES.map((f, i) => (
            <StaggerItem key={f.title}>
              <TiltCard max={6} className="h-full overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#1A1D1A] transition-colors duration-300 hover:border-brand-mint/30">
              <motion.div whileHover="hover" initial="rest" animate="rest" className="group relative h-full p-6">
                <TopoLines pattern={i % 2 ? 'a' : 'b'} levels={8} className="opacity-50" />
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-mint/0 blur-3xl transition-colors duration-700 group-hover:bg-brand-mint/20" />
                <div className="relative h-11 w-11 [transform:translateZ(30px)]">
                  <motion.span variants={{ rest: { scale: 1, rotate: 0 }, hover: { scale: 0.6, rotate: -20, opacity: 0 } }} transition={{ duration: 0.3, ease: ease.out }}
                    className="absolute inset-0 flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-brand-mint backdrop-blur"><f.icon className="h-5 w-5" /></motion.span>
                  <motion.span variants={{ rest: { scale: 0.6, rotate: 20, opacity: 0 }, hover: { scale: 1, rotate: 0, opacity: 1 } }} transition={{ duration: 0.3, ease: ease.out }}
                    className="absolute inset-0 flex items-center justify-center rounded-2xl bg-brand-mint text-brand-night shadow-[0_0_24px_rgba(35,178,74,.5)]"><f.icon className="h-5 w-5" /></motion.span>
                </div>
                <p className="relative mt-5 font-display text-[20px] font-medium tracking-[-0.02em] text-paper">{f.title}</p>
                <p className="relative mt-1.5 text-[14px] leading-relaxed text-paper/55">{f.body}</p>
                <motion.span variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }} transition={{ duration: 0.45, ease: ease.out }}
                  className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-gradient-to-r from-brand-forest to-brand-mint" />
              </motion.div>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
