import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, CalendarCheck2, ClipboardCheck, Flag, PhoneCall, Plus, Video } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { fmtDateTime, humanize, inr, relTime } from '@/lib/format';
import type { Achievement, LifecycleStage, MyDayItem, QueueRow } from '@/lib/types';
import { Button, Card, CardHeader, Empty, PageHeader, Segmented, Skeleton, Stat } from '@/components/ui/ui';
import { stageLabel } from '@/components/ui/status';
import { RecordOutcomeModal, type MeetingRef } from '@/features/pipeline/PipelineForms';
import { AddAccountModal } from '@/features/accounts/AccountForms';

type Preset = '7' | '30' | 'month' | 'quarter';
const PRESETS: { value: Preset; label: string }[] = [{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: 'month', label: 'This month' }, { value: 'quarter', label: 'Quarter' }];
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const today = () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

export default function HomePage() {
  const { user } = useAuth();
  const [preset, setPreset] = useState<Preset>('30');
  const first = user?.fullName.split(' ')[0];
  const header = <PageHeader title={`${greeting()}, ${first}`} subtitle={today()} actions={<Segmented value={preset} onChange={setPreset} options={PRESETS} />} />;
  if (user?.role === 'BDR') return <>{header}<BdrHome preset={preset} /></>;
  if (user?.role === 'AE') return <>{header}<AeHome preset={preset} /></>;
  return <>{header}<LeaderHome preset={preset} /></>;
}

// ---------------------------------------------------------------- BDR

interface BdrDash {
  calls: number; connects: number; leadsGenerated: number; sqlsSubmitted: number; sqlsApproved: number; sqlsRejected: number;
  l1Booked: number; l1Done: number; noShows: number; smallAccountShare: number; sqlToL1DonePct: number | null; revivalAccountsDue: number;
  targets: Achievement[];
}

function BdrHome({ preset }: { preset: Preset }) {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const { data: d } = useQuery({ queryKey: ['dashboard', 'bdr', preset], queryFn: () => api.get<BdrDash>('/api/dashboards/bdr', { preset }) });
  const day = useQuery({ queryKey: ['my-day'], queryFn: () => api.get<MyDayItem[]>('/api/my-day') });
  const due = (day.data ?? []).filter((x) => x.section === 'OVERDUE' || x.section === 'DUE_TODAY');
  const fresh = (day.data ?? []).filter((x) => x.section === 'UNTOUCHED');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-accent/15 bg-gradient-to-r from-accent-soft/70 to-white p-5 shadow-card md:flex-row md:items-center">
        <div className="flex-1">
          <p className="text-[15px] font-semibold">Today: {due.length} follow-ups and {fresh.length} new leads</p>
          <p className="mt-0.5 text-[13px] text-ink-muted">{due.filter((x) => x.section === 'OVERDUE').length ? `${due.filter((x) => x.section === 'OVERDUE').length} overdue — start with ${due.filter((x) => x.section === 'OVERDUE').length === 1 ? 'that one' : 'those'}.` : 'You’re on track. Keep the momentum going.'}</p>
        </div>
        <div className="flex gap-2">
          <Button icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAdding(true)}>New account</Button>
          <Button variant="primary" icon={<PhoneCall className="h-3.5 w-3.5" />} onClick={() => navigate('/my-day')}>Open My Day</Button>
        </div>
      </div>

      {!d ? <StatSkeleton /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Stat label="Calls" value={d.calls} />
          <Stat label="Connects" value={d.connects} hint={d.calls ? `${Math.round((100 * d.connects) / d.calls)}% connect rate` : undefined} />
          <Stat label="Leads added" value={d.leadsGenerated} />
          <Stat label="SQLs submitted" value={d.sqlsSubmitted} onClick={() => navigate('/sql')} />
          <Stat label="SQLs approved" value={d.sqlsApproved} tone="success" hint={d.sqlsRejected ? `${d.sqlsRejected} rejected` : undefined} />
          <Stat label="L1 done" value={d.l1Done} hint={d.noShows ? `${d.noShows} no-shows` : `${d.l1Booked} booked`} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Up next" action={<Link to="/my-day" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">My Day<ArrowRight className="h-3 w-3" /></Link>} />
          {day.isLoading ? <div className="p-4"><Skeleton className="h-32" /></div> : (day.data ?? []).length === 0 ? (
            <Empty icon={<CalendarCheck2 className="h-5 w-5" />} title="Nothing queued" body="Add stakeholders to accounts to build your calling list." />
          ) : (
            <ul className="divide-y divide-line px-2 pb-2 pt-1">
              {[...due, ...fresh].slice(0, 6).map((x, i) => (
                <li key={i}>
                  <Link to="/my-day" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-canvas">
                    <span className={cn('h-1.5 w-1.5 rounded-full', x.section === 'OVERDUE' ? 'bg-danger' : x.section === 'DUE_TODAY' ? 'bg-accent' : 'bg-success')} />
                    <span className="min-w-0 flex-1 truncate text-[13px]"><b className="font-medium">{x.stakeholderName ?? x.accountName}</b> <span className="text-ink-muted">· {x.accountName}</span></span>
                    <span className="text-2xs text-ink-muted">{x.section === 'UNTOUCHED' ? 'New' : relTime(x.dueAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Targets targets={d?.targets} extra={d && (
          <div className="grid grid-cols-3 gap-2 border-t border-line px-4 py-3 text-center">
            <Mini label="SQL → L1 done" value={d.sqlToL1DonePct != null ? `${d.sqlToL1DonePct}%` : '—'} />
            <Mini label="Small-account share" value={`${d.smallAccountShare ?? 0}%`} warn={(d.smallAccountShare ?? 0) > 20} />
            <Mini label="Revivals due" value={d.revivalAccountsDue} />
          </div>
        )} />
      </div>
      <AddAccountModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

// ---------------------------------------------------------------- AE

function AeHome({ preset }: { preset: Preset }) {
  const navigate = useNavigate();
  const [outcomeFor, setOutcomeFor] = useState<MeetingRef | null>(null);
  const { data: d } = useQuery({ queryKey: ['dashboard', 'ae', preset], queryFn: () => api.get<Record<string, never>>('/api/dashboards/ae', { preset }) });
  const overdue = useQuery({ queryKey: ['overdue-outcomes'], queryFn: () => api.get<{ id: string; level: 'L1' | 'L2' | 'L3' | 'OTHER'; scheduledStart: string; accountId: string; accountName: string }[]>('/api/meetings/overdue-outcomes') });
  const flagged = useQuery({ queryKey: ['to-be-moved'], queryFn: () => api.get<{ id: string; name: string; stage: LifecycleStage; lastActivityAt?: string }[]>('/api/lifecycle/to-be-moved') });
  const byStage = (d?.opportunitiesByStage as unknown as { stage: LifecycleStage; count: number }[] | undefined) ?? [];
  const mrr = (d?.mrrByTemperature as unknown as { temperature: string; count: number; mrr: number }[] | undefined) ?? [];

  return (
    <div className="space-y-4">
      {(overdue.data?.length ?? 0) > 0 && (
        <Card className="border-warning/40">
          <CardHeader title={<span className="flex items-center gap-2"><Video className="h-4 w-4 text-warning" />{overdue.data!.length} meeting{overdue.data!.length > 1 ? 's need' : ' needs'} an outcome</span>} subtitle="Stages and tasks update only after you record what happened." />
          <ul className="divide-y divide-line px-2 pb-2 pt-1">
            {overdue.data!.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-2 py-2">
                <span className="rounded-md bg-canvas px-1.5 py-0.5 text-2xs font-semibold">{m.level}</span>
                <Link to={`/accounts/${m.accountId}`} className="flex-1 text-[13px] font-medium hover:text-accent">{m.accountName}</Link>
                <span className="text-xs text-ink-muted">{fmtDateTime(m.scheduledStart)}</span>
                <Button size="sm" variant="primary" onClick={() => setOutcomeFor({ id: m.id, level: m.level, accountId: m.accountId, accountName: m.accountName })}>Record outcome</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!d ? <StatSkeleton /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Stat label="Active accounts" value={d.active} onClick={() => navigate('/pipeline')} />
          <Stat label="L1 pending" value={d.l1Pending} />
          <Stat label="L2 pending" value={d.l2Pending} />
          <Stat label="L3 pending" value={d.l3Pending} />
          <Stat label="Follow-ups today" value={d.followUpsDueToday} hint={d.followUpsOverdue ? `${d.followUpsOverdue} overdue` : undefined} tone={d.followUpsOverdue ? 'danger' : undefined} onClick={() => navigate('/tasks')} />
          <Stat label="Need multithreading" value={d.accountsNeedingMultithreading} tone={d.accountsNeedingMultithreading ? 'warning' : undefined} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Your pipeline by stage" action={<Link to="/pipeline" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">Board<ArrowRight className="h-3 w-3" /></Link>} />
          <div className="h-56 px-2 pb-3 pt-2">
            <ResponsiveContainer>
              <BarChart data={byStage.map((s) => ({ name: stageLabel[s.stage] ?? s.stage, count: Number(s.count) }))}>
                <CartesianGrid vertical={false} stroke="#E4E6E5" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="#737C77" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="#737C77" width={28} />
                <Tooltip cursor={{ fill: 'rgba(6,63,26,0.05)' }} contentStyle={{ borderRadius: 8, border: '1px solid #E4E6E5', fontSize: 12 }} />
                <Bar dataKey="count" name="Accounts" fill="#063F1A" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Expected MRR by temperature" />
          <ul className="space-y-3 p-4">
            {mrr.length === 0 && <p className="text-xs text-ink-muted">Set temperature and MRR on your opportunities to see this.</p>}
            {mrr.map((m) => {
              const max = Math.max(...mrr.map((x) => Number(x.mrr)), 1);
              const color = m.temperature === 'HOT' ? 'bg-danger' : m.temperature === 'WARM' ? 'bg-warning' : m.temperature === 'COLD' ? 'bg-sky-400' : 'bg-ink-muted/40';
              return (
                <li key={m.temperature}>
                  <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{humanize(m.temperature)} <span className="font-normal text-ink-muted">· {m.count}</span></span><span className="tabular-nums">{inr(m.mrr)}</span></div>
                  <div className="h-2 rounded-full bg-canvas"><div className={cn('h-2 rounded-full', color)} style={{ width: `${(100 * Number(m.mrr)) / max}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Flag className="h-4 w-4 text-warning" />Flagged — decide: keep or move to inactive</span>} />
          {(flagged.data ?? []).length === 0 ? <p className="px-4 pb-4 pt-2 text-xs text-ink-muted">No accounts flagged. Nice.</p> : (
            <ul className="divide-y divide-line px-2 pb-2 pt-1">
              {flagged.data!.slice(0, 8).map((a) => (
                <li key={a.id}><Link to={`/accounts/${a.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 text-[13px] hover:bg-canvas">
                  <span className="flex-1 font-medium">{a.name}</span><span className="text-xs text-ink-muted">{stageLabel[a.stage]} · last touched {relTime(a.lastActivityAt)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
        <Targets targets={d?.targets as unknown as Achievement[] | undefined} />
      </div>
      <RecordOutcomeModal open={!!outcomeFor} onClose={() => setOutcomeFor(null)} meeting={outcomeFor} />
    </div>
  );
}

// ---------------------------------------------------------------- Manager / Admin

interface Leadership {
  funnel: { stage: string; count: number; conversionFromPreviousPct?: number | null }[];
  pipelineMrr: number;
  activeVsInactive: { status: string; count: number }[];
  stuckAccounts: { stage: LifecycleStage; count: number }[];
  winsAndLosses: { outcome: string; count: number; mrr: number }[];
  opportunitiesByAe: { ae: string; stage: LifecycleStage; count: number }[];
  averageDaysInStage: { stage: LifecycleStage; avgDays: number; opportunities: number }[];
}

function LeaderHome({ preset }: { preset: Preset }) {
  const navigate = useNavigate();
  const { data: d } = useQuery({ queryKey: ['dashboard', 'lead', preset], queryFn: () => api.get<Leadership>('/api/dashboards/leadership', { preset }) });
  const queue = useQuery({ queryKey: ['queue'], queryFn: () => api.get<QueueRow[]>('/api/assignment/queue') });
  const hygiene = useQuery({ queryKey: ['dashboard', 'hygiene'], queryFn: () => api.get<Record<string, unknown[]>>('/api/dashboards/hygiene') });
  const active = d?.activeVsInactive.find((x) => x.status === 'ACTIVE')?.count ?? 0;
  const inactive = d?.activeVsInactive.find((x) => x.status === 'INACTIVE')?.count ?? 0;
  const won = d?.winsAndLosses.filter((w) => w.outcome !== 'LOST').reduce((s, w) => s + Number(w.count), 0) ?? 0;
  const toReview = queue.data?.filter((q) => q.status !== 'QUALIFIED_SQL').length ?? 0;
  const toAssign = queue.data?.filter((q) => q.status === 'QUALIFIED_SQL').length ?? 0;
  const stuck = d?.stuckAccounts.reduce((s, x) => s + Number(x.count), 0) ?? 0;

  const byAe = Object.values((d?.opportunitiesByAe ?? []).reduce<Record<string, { ae: string; total: number; stages: Record<string, number> }>>((m, r) => {
    m[r.ae] ??= { ae: r.ae, total: 0, stages: {} };
    m[r.ae].total += Number(r.count); m[r.ae].stages[r.stage] = Number(r.count);
    return m;
  }, {})).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-4">
      {(toReview + toAssign) > 0 && (
        <button onClick={() => navigate('/sql')} className="flex w-full items-center gap-3 rounded-xl border border-accent/20 bg-accent-soft/50 p-4 text-left shadow-card transition-colors hover:bg-accent-soft">
          <ClipboardCheck className="h-5 w-5 text-accent" />
          <span className="flex-1 text-[13.5px]"><b>{toReview} SQL{toReview === 1 ? '' : 's'} to review</b>{toAssign > 0 && <> and <b>{toAssign} waiting for an AE</b></>}</span>
          <span className="flex items-center gap-1 text-xs font-medium text-accent">Open queue<ArrowRight className="h-3.5 w-3.5" /></span>
        </button>
      )}

      {!d ? <StatSkeleton /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Pipeline MRR" value={inr(d.pipelineMrr)} />
          <Stat label="Active pipeline" value={active} onClick={() => navigate('/pipeline')} />
          <Stat label="Inactive" value={inactive} />
          <Stat label="Won (period)" value={won} tone="success" />
          <Stat label="Stuck accounts" value={stuck} tone={stuck ? 'warning' : undefined} hint="Past stage threshold" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Funnel" subtitle="Accounts reaching each stage in the period, with conversion from the step before." />
          <div className="space-y-2.5 p-4">
            {d?.funnel.map((f, i) => {
              const max = Math.max(...d.funnel.map((x) => Number(x.count)), 1);
              return (
                <div key={f.stage} className="flex items-center gap-3">
                  <span className="w-12 text-xs font-medium text-ink-soft">{f.stage}</span>
                  <div className="h-7 flex-1 rounded-md bg-canvas">
                    <div className="flex h-7 items-center rounded-md px-2 text-xs font-semibold text-white transition-all" style={{ width: `${Math.max(6, (100 * Number(f.count)) / max)}%`, background: `rgba(6,63,26,${1 - i * 0.13})` }}>{f.count}</div>
                  </div>
                  <span className="w-14 text-right text-2xs text-ink-muted">{f.conversionFromPreviousPct != null ? `${f.conversionFromPreviousPct}%` : ''}</span>
                </div>
              );
            }) ?? <Skeleton className="h-40" />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Average days in stage" />
          <div className="h-60 px-2 pb-3">
            <ResponsiveContainer>
              <BarChart layout="vertical" data={(d?.averageDaysInStage ?? []).map((x) => ({ name: stageLabel[x.stage] ?? x.stage, days: Number(x.avgDays) }))} margin={{ left: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} fontSize={11} stroke="#737C77" />
                <Tooltip cursor={{ fill: 'rgba(6,63,26,0.05)' }} contentStyle={{ borderRadius: 8, border: '1px solid #E4E6E5', fontSize: 12 }} formatter={(v) => [`${v} days`, 'Average']} />
                <Bar dataKey="days" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {(d?.averageDaysInStage ?? []).map((_, i) => <Cell key={i} fill={i % 2 ? '#8BC34A' : '#063F1A'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Pipeline by AE" />
          <div className="overflow-x-auto p-2">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-2xs uppercase tracking-wide text-ink-muted">
                <th className="px-2 py-2 font-medium">AE</th>{(['L1', 'L2', 'L3', 'NEGOTIATION', 'WON'] as LifecycleStage[]).map((s) => <th key={s} className="px-2 text-right font-medium">{stageLabel[s]}</th>)}<th className="px-2 text-right font-medium">Total</th></tr></thead>
              <tbody>
                {byAe.map((r) => (
                  <tr key={r.ae} className="border-t border-line/70">
                    <td className="px-2 py-2 font-medium">{r.ae}</td>
                    {(['L1', 'L2', 'L3', 'NEGOTIATION', 'WON'] as LifecycleStage[]).map((s) => <td key={s} className="px-2 text-right tabular-nums text-ink-soft">{r.stages[s] ?? '·'}</td>)}
                    <td className="px-2 text-right font-semibold tabular-nums">{r.total}</td>
                  </tr>
                ))}
                {byAe.length === 0 && <tr><td colSpan={7} className="px-2 py-6 text-center text-xs text-ink-muted">No pipeline accounts yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader title="Data hygiene" subtitle="Fix these to keep the numbers honest." action={<Link to="/reports" className="text-xs font-medium text-accent hover:underline">Reports</Link>} />
          <ul className="space-y-1 p-3">
            {[['noNextStep', 'Accounts with no next step'], ['overdueTasksByUser', 'People with overdue tasks'], ['meetingsWithoutOutcome', 'Meetings without outcome'],
              ['stagnationReasonMissing', 'Stuck without a reason'], ['inactiveMissingReasonDetail', 'Inactive missing details']].map(([k, label]) => {
              const n = (hygiene.data?.[k] as unknown[] | undefined)?.length ?? 0;
              return (
                <li key={k} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] hover:bg-canvas">
                  <span>{label}</span><span className={cn('min-w-6 rounded-md px-1.5 text-center text-xs font-semibold tabular-nums', n ? 'bg-warning-soft text-[#8A5A0B]' : 'bg-success-soft text-success')}>{hygiene.isLoading ? '…' : n}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- shared

function Targets({ targets, extra }: { targets?: Achievement[]; extra?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title="Targets this month" />
      {!targets?.length ? <p className="px-4 pb-4 pt-2 text-xs text-ink-muted">No targets set yet — your manager sets them under Reports.</p> : (
        <ul className="space-y-3 p-4">
          {targets.map((t) => {
            const pct = Math.min(100, Math.round(t.pct ?? 0));
            return (
              <li key={t.metric}>
                <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{humanize(t.metric)}</span>
                  <span className="tabular-nums text-ink-muted">{t.metric === 'MRR' ? `${inr(t.actual)} / ${inr(t.target)}` : `${Number(t.actual)} / ${Number(t.target)}`}</span></div>
                <div className="h-2 rounded-full bg-canvas"><div className={cn('h-2 rounded-full transition-all', pct >= 100 ? 'bg-success' : pct >= 60 ? 'bg-accent' : 'bg-warning')} style={{ width: `${pct}%` }} /></div>
              </li>
            );
          })}
        </ul>
      )}
      {extra}
    </Card>
  );
}

function Mini({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return <div><p className={cn('text-[15px] font-semibold tabular-nums', warn && 'text-warning')}>{value}</p><p className="text-2xs text-ink-muted">{label}</p></div>;
}

function StatSkeleton() {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}</div>;
}
