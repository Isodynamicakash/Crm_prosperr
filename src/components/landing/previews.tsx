import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CalendarClock, Check, CheckCircle2, Flame, Phone, PhoneCall, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CountUp } from '@/lib/animations/components';
import { ease } from '@/lib/animations';

/*
 * React-rendered previews of the real CRM screens, built from the same tokens and terms as the app.
 * All names and numbers are illustrative sample data (labelled in the UI), never customer claims.
 */

export function AppWindow({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-black/5 bg-canvas text-ink shadow-[0_30px_80px_-20px_rgba(6,63,26,.45)]', className)}>
      <div className="flex items-center gap-1.5 border-b border-line bg-white px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#E4E6E5]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E4E6E5]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E4E6E5]" />
        <span className="ml-3 text-[11px] font-medium text-ink-muted">{title}</span>
        <span className="ml-auto rounded bg-canvas px-1.5 py-0.5 text-[10px] text-ink-muted">Sample data</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const Kpi = ({ label, to, prefix, suffix, tone }: { label: string; to: number; prefix?: string; suffix?: string; tone?: string }) => (
  <div className="rounded-xl border border-line bg-white p-3">
    <p className="text-[11px] text-ink-muted">{label}</p>
    <p className={cn('mt-1 text-xl font-semibold tracking-tight', tone)}><CountUp to={to} prefix={prefix} suffix={suffix} /></p>
  </div>
);

function Bars({ values, className, color = 'bg-brand-forest' }: { values: number[]; className?: string; color?: string }) {
  const reduce = useReducedMotion();
  const max = Math.max(...values);
  return (
    <div className={cn('flex h-28 items-end gap-2', className)}>
      {values.map((v, i) => (
        <motion.div key={i} className={cn('flex-1 origin-bottom rounded-t-md', i === values.length - 1 ? 'bg-brand-lime' : color)}
          style={{ height: `${(v / max) * 100}%` }}
          initial={{ scaleY: reduce ? 1 : 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.9, delay: i * 0.06, ease: ease.out }} />
      ))}
    </div>
  );
}

export function DashboardPreview() {
  return (
    <AppWindow title="Home · Sales manager">
      <div className="grid grid-cols-4 gap-2.5">
        <Kpi label="SQLs this month" to={46} />
        <Kpi label="L1 meetings" to={31} />
        <Kpi label="Pipeline MRR" to={18.4} prefix="₹" suffix="L" />
        <Kpi label="Win rate" to={27} suffix="%" tone="text-success" />
      </div>
      <div className="mt-3 grid grid-cols-[1.4fr_1fr] gap-2.5">
        <div className="rounded-xl border border-line bg-white p-3">
          <p className="mb-2 text-[11px] font-medium text-ink-soft">Accounts by stage</p>
          <Bars values={[42, 30, 22, 16, 11, 7, 5]} />
          <div className="mt-1.5 grid grid-cols-7 text-center text-[9px] text-ink-muted">{['SQL', 'L1', 'MT', 'L2', 'L3', 'Neg.', 'Won'].map((s) => <span key={s}>{s}</span>)}</div>
        </div>
        <div className="space-y-1.5 rounded-xl border border-line bg-white p-3">
          <p className="text-[11px] font-medium text-ink-soft">Needs attention</p>
          {[['Outcomes overdue', 3], ['SQLs waiting review', 5], ['Needs multithreading', 4]].map(([l, n]) => (
            <div key={l} className="flex items-center justify-between rounded-lg bg-canvas px-2 py-1.5 text-[11px]"><span>{l}</span><span className="rounded bg-warning-soft px-1.5 font-semibold text-[#8A5A0B]">{n}</span></div>
          ))}
        </div>
      </div>
    </AppWindow>
  );
}

export function AccountsPreview() {
  const rows = [
    ['Northwind Logistics', 'Bengaluru · P0', 'L1', 'Hot'], ['Asterix Pharma', 'Pune · P0', 'SQL', 'Warm'],
    ['Kestrel Fintech', 'Mumbai · P1', 'L2', 'Hot'], ['Orbit Retail', 'Gurugram · P0', 'Prospect', '—'], ['Vela Edtech', 'Chennai · P1', 'L3', 'Warm'],
  ];
  return (
    <AppWindow title="Accounts">
      <div className="mb-2.5 flex gap-1.5 text-[11px]">
        {['My accounts', 'In pipeline', 'Hot', 'Needs follow-up'].map((v, i) => <span key={v} className={cn('rounded-md px-2 py-1', i === 0 ? 'bg-white font-medium shadow-card ring-1 ring-line' : 'text-ink-muted')}>{v}</span>)}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {rows.map(([n, c, s, t], i) => (
          <motion.div key={n} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.5, ease: ease.out }}
            className="flex items-center gap-3 border-b border-line/70 px-3 py-2 text-[12px] last:border-0">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-forest-50 text-[10px] font-semibold text-brand-forest">{n[0]}</span>
            <span className="flex-1 font-medium">{n}</span><span className="w-28 text-ink-muted">{c}</span>
            <span className="w-16 rounded-md bg-brand-navy-50 px-1.5 py-0.5 text-center text-[10px] font-medium text-brand-navy">{s}</span>
            <span className={cn('w-12 text-[11px]', t === 'Hot' ? 'text-danger' : 'text-ink-muted')}>{t}</span>
          </motion.div>
        ))}
      </div>
    </AppWindow>
  );
}

export function MyDayPreview() {
  return (
    <AppWindow title="My Day · BDR">
      <div className="grid grid-cols-3 gap-2.5">
        <Kpi label="Calls today" to={38} /><Kpi label="Connected" to={11} /><Kpi label="L1 booked" to={2} tone="text-success" />
      </div>
      <p className="mb-1.5 mt-3 text-[11px] font-medium text-ink-soft">Call queue</p>
      <div className="space-y-1.5">
        {[['Priya S.', 'CFO · Northwind Logistics', 'Follow-up due'], ['Rahul M.', 'Head of Payroll · Orbit Retail', 'New'], ['Anita K.', 'CHRO · Asterix Pharma', '2nd attempt']].map(([n, d, s], i) => (
          <div key={n} className={cn('flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2', i === 0 ? 'border-brand-lime ring-2 ring-brand-lime/30' : 'border-line')}>
            <Phone className="h-3.5 w-3.5 text-brand-forest" />
            <div className="flex-1 text-[12px]"><p className="font-medium">{n}</p><p className="text-[10.5px] text-ink-muted">{d}</p></div>
            <span className="text-[10.5px] text-ink-muted">{s}</span>
            <span className="rounded-md bg-brand-forest px-2 py-1 text-[10.5px] font-medium text-white">Log call</span>
          </div>
        ))}
      </div>
    </AppWindow>
  );
}

export function PipelinePreview() {
  const cols: [string, [string, string][]][] = [
    ['L1 done', [['Northwind', '₹3.2L'], ['Orbit', '₹1.8L']]], ['L2', [['Kestrel', '₹5.0L']]], ['L3', [['Vela', '₹2.4L']]], ['Negotiation', [['Asterix', '₹4.1L']]],
  ];
  return (
    <AppWindow title="Pipeline · AE">
      <div className="grid grid-cols-4 gap-2">
        {cols.map(([c, cards], ci) => (
          <div key={c} className="rounded-xl bg-black/[0.035] p-2">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-brand-forest-600" />{c}</p>
            {cards.map(([n, v], i) => (
              <motion.div key={n} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: ci * 0.1 + i * 0.08, ease: ease.out, duration: 0.6 }}
                className="mb-1.5 rounded-lg border border-line bg-white p-2 text-[11px] shadow-card">
                <p className="font-medium">{n}</p><p className="mt-0.5 flex items-center gap-1 text-ink-muted"><Flame className="h-3 w-3 text-danger" />{v}</p>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </AppWindow>
  );
}

export function MeetingsPreview() {
  return (
    <AppWindow title="Meetings">
      {[['L2', 'Thu, 10:30 am', 'Kestrel Fintech', 'Scheduled'], ['L1', 'Yesterday, 4:00 pm', 'Northwind Logistics', 'Done — moving ahead'], ['L1', 'Mon, 11:00 am', 'Orbit Retail', 'Rescheduled']].map(([l, t, a, s]) => (
        <div key={a} className="mb-1.5 flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-[11px] font-semibold">{l}</span>
          <div className="flex-1 text-[12px]"><p className="font-medium">{a}</p><p className="flex items-center gap-1 text-[10.5px] text-ink-muted"><CalendarClock className="h-3 w-3" />{t}</p></div>
          <span className={cn('rounded-md px-1.5 py-0.5 text-[10.5px] font-medium', s.startsWith('Done') ? 'bg-success-soft text-success' : s === 'Scheduled' ? 'bg-brand-navy-50 text-brand-navy' : 'bg-warning-soft text-[#8A5A0B]')}>{s}</span>
        </div>
      ))}
    </AppWindow>
  );
}

export function AnalyticsPreview() {
  const team = [['Aditya', 92], ['Meera', 81], ['Vishal', 74], ['Karan', 63]] as const;
  return (
    <AppWindow title="Team performance">
      <div className="grid grid-cols-2 gap-2.5">
        <Kpi label="Target attainment" to={84} suffix="%" /><Kpi label="Avg. days SQL → L1" to={4.2} suffix=" d" />
      </div>
      <div className="mt-3 space-y-2 rounded-xl border border-line bg-white p-3">
        {team.map(([n, v], i) => (
          <div key={n} className="flex items-center gap-2 text-[11px]">
            <span className="w-14 text-ink-soft">{n}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-forest to-brand-lime" initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 1.1, delay: i * 0.1, ease: ease.out }} />
            </div>
            <span className="w-8 text-right tabular-nums text-ink-muted">{v}%</span>
          </div>
        ))}
      </div>
    </AppWindow>
  );
}

export function ReportsPreview() {
  const funnel = [['Contacts mined', 100], ['Connected', 46], ['SQL', 22], ['L1 done', 15], ['Won', 5]] as const;
  return (
    <AppWindow title="Leadership report">
      <div className="space-y-1.5">
        {funnel.map(([l, v], i) => (
          <div key={l} className="flex items-center gap-3 text-[11px]">
            <span className="w-24 text-ink-soft">{l}</span>
            <motion.div className="flex h-6 items-center justify-end rounded-md bg-brand-navy px-2 text-[10px] font-semibold text-white"
              style={{ opacity: 1 - i * 0.12 }} initial={{ width: 0 }} whileInView={{ width: `${Math.max(v, 8)}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.1, ease: ease.out }}>{v}%</motion.div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-forest-50 px-3 py-2 text-[11px] text-brand-forest"><TrendingUp className="h-3.5 w-3.5" />Expected MRR up <b>18%</b> quarter on quarter</div>
    </AppWindow>
  );
}

/* ---------------- floating hero cards ---------------- */

export function IcpCard() {
  return (
    <div className="w-60 rounded-2xl border border-white/15 bg-white/95 p-3.5 text-ink shadow-pop backdrop-blur">
      <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold"><Sparkles className="h-3.5 w-3.5 text-brand-forest" />ICP checklist</p>
      {[['BANT', true], ['Licenses', true], ['Location', true], ['Right stakeholder', true]].map(([l]) => (
        <p key={l as string} className="flex items-center gap-2 py-0.5 text-[11.5px]"><CheckCircle2 className="h-3.5 w-3.5 text-success" />{l}</p>
      ))}
      <p className="mt-2 rounded-lg bg-success-soft px-2 py-1 text-center text-[11px] font-medium text-success">Ready to submit SQL</p>
    </div>
  );
}

export function CallCard() {
  return (
    <div className="w-56 rounded-2xl border border-white/15 bg-white/95 p-3.5 text-ink shadow-pop backdrop-blur">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold"><PhoneCall className="h-3.5 w-3.5 text-brand-forest" />Call logged</p>
      <p className="mt-1 text-[11px] text-ink-muted">CFO · Northwind Logistics</p>
      <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-brand-lime-50 px-2 py-1 text-[11px] text-[#4D7A1C]"><Check className="h-3 w-3" />L1 booked for Thu, 11:00</p>
    </div>
  );
}

export function DealCard() {
  return (
    <div className="w-52 rounded-2xl border border-white/15 bg-white/95 p-3.5 text-ink shadow-pop backdrop-blur">
      <div className="flex items-center justify-between text-[12px] font-semibold">Kestrel Fintech<Flame className="h-3.5 w-3.5 text-danger" /></div>
      <p className="mt-1 text-[11px] text-ink-muted">L2 · ₹5.0L expected MRR</p>
      <div className="mt-2 flex gap-1">{[1, 1, 1, 0, 0].map((d, i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full', d ? 'bg-brand-forest' : 'bg-line')} />)}</div>
    </div>
  );
}
