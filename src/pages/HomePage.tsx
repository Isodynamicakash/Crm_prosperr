import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CalendarCheck2, ClipboardCheck, Flag, PhoneCall, Plus, Video } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { humanize, inr, relTime } from '@/lib/format';
import type { Achievement, LifecycleStage, MyDayItem, QueueRow } from '@/lib/types';
import { Button, Empty } from '@/components/ui/ui';
import { stageLabel } from '@/components/ui/status';
import { C, ChartCard, Donut, EmptyChart, Funnel, GroupedBars, Meter, RadialGauge } from '@/components/charts/kit';
import { ActivityTrendCard, CommandHero, HeatmapCard, LiveFeedCard, OutcomeMixCard, StageMixCard, delta, sum, usePulse, type Preset } from '@/features/dashboard/pulse';
import { RecordOutcomeModal, type MeetingRef } from '@/features/pipeline/PipelineForms';
import { AddAccountModal } from '@/features/accounts/AccountForms';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const today = () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
const LIVE = { refetchInterval: 30_000, refetchOnWindowFocus: true } as const;

export default function HomePage() {
  const { user } = useAuth();
  const [preset, setPreset] = useState<Preset>('30');
  const first = user?.fullName.split(' ')[0] ?? '';
  const props = { preset, setPreset, first };
  if (user?.role === 'BDR') return <BdrHome {...props} />;
  if (user?.role === 'AE') return <AeHome {...props} />;
  return <LeaderHome {...props} />;
}

type HomeProps = { preset: Preset; setPreset: (p: Preset) => void; first: string };

// ---------------------------------------------------------------- BDR

interface BdrDash {
  calls: number; connects: number; leadsGenerated: number; sqlsSubmitted: number; sqlsApproved: number; sqlsRejected: number;
  l1Booked: number; l1Done: number; noShows: number; smallAccountShare: number; sqlToL1DonePct: number | null; revivalAccountsDue: number;
  targets: Achievement[];
}

function BdrHome({ preset, setPreset, first }: HomeProps) {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const pulse = usePulse(preset);
  const { data: d } = useQuery({ queryKey: ['dashboard', 'bdr', preset], queryFn: () => api.get<BdrDash>('/api/dashboards/bdr', { preset }), ...LIVE });
  const day = useQuery({ queryKey: ['my-day'], queryFn: () => api.get<MyDayItem[]>('/api/my-day'), ...LIVE });
  const s = pulse.data?.series;
  const due = (day.data ?? []).filter((x) => x.section === 'OVERDUE' || x.section === 'DUE_TODAY');
  const fresh = (day.data ?? []).filter((x) => x.section === 'UNTOUCHED');
  const overdue = due.filter((x) => x.section === 'OVERDUE').length;
  const calls = d?.calls ?? sum(s, 'calls');
  const connectRate = calls ? Math.round((100 * (d?.connects ?? sum(s, 'connects'))) / calls) : 0;
  const approval = d?.sqlsSubmitted ? Math.round((100 * d.sqlsApproved) / d.sqlsSubmitted) : 0;

  return (
    <div className="space-y-4">
      <CommandHero title={`${greeting()}, ${first}`} subtitle={`Your prospecting pulse · ${today()}`} preset={preset} onPreset={setPreset}
        pulse={s} updatedAt={pulse.dataUpdatedAt} fetching={pulse.isFetching} onRefresh={() => pulse.refetch()}
        kpis={[
          { label: 'Calls', value: calls, spark: 'calls', delta: delta(s, 'calls'), to: '/my-day' },
          { label: 'Connect rate', value: `${connectRate}%`, spark: 'connects', delta: delta(s, 'connects'), hint: `${d?.connects ?? 0} conversations` },
          { label: 'SQLs submitted', value: d?.sqlsSubmitted ?? '—', spark: 'sqls', delta: delta(s, 'sqls'), hint: d ? `${d.sqlsApproved} approved` : undefined, to: '/sql' },
          { label: 'L1 booked', value: d?.l1Booked ?? '—', spark: 'meetingsBooked', delta: delta(s, 'meetingsBooked'), hint: d ? `${d.l1Done} done · ${d.noShows} no-show` : undefined },
        ]}>
        <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur md:flex-row md:items-center">
          <div className="flex-1">
            <p className="text-[15px] font-semibold">Today: {due.length} follow-ups and {fresh.length} new leads</p>
            <p className="mt-0.5 text-[13px] text-paper/55">{overdue ? `${overdue} overdue — start with ${overdue === 1 ? 'that one' : 'those'}.` : 'You’re on track. Keep the momentum going.'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(true)} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-[13px] font-semibold text-paper transition-colors hover:bg-white/10"><Plus className="h-4 w-4" />New account</button>
            <button onClick={() => navigate('/my-day')} className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-mint px-4 text-[13px] font-semibold text-brand-night shadow-[0_0_20px_rgba(35,178,74,.4)] transition-transform hover:-translate-y-0.5"><PhoneCall className="h-4 w-4" />Open My Day</button>
          </div>
        </div>
      </CommandHero>

      <div className="grid gap-4 xl:grid-cols-3">
        <ActivityTrendCard s={s} className="xl:col-span-2" />
        <OutcomeMixCard mix={pulse.data?.outcomeMix} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Conversion" subtitle="How your work turns into meetings">
          <div className="grid grid-cols-2 gap-2 pt-2">
            <RadialGauge value={approval} label="SQL approval" sub={`${d?.sqlsApproved ?? 0} of ${d?.sqlsSubmitted ?? 0}`} size={118} />
            <RadialGauge value={d?.sqlToL1DonePct ?? 0} label="SQL → L1 done" sub={`${d?.l1Done ?? 0} meetings held`} size={118} color={C.forest} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 text-center">
            <Mini label="Small-account share" value={`${d?.smallAccountShare ?? 0}%`} warn={(d?.smallAccountShare ?? 0) > 20} />
            <Mini label="Revivals due" value={d?.revivalAccountsDue ?? 0} />
          </div>
        </ChartCard>
        <TargetsCard targets={d?.targets} />
        <ChartCard title="Up next" subtitle="From your calling list" action={<Link to="/my-day" className="flex items-center gap-1 text-xs font-semibold text-brand-forest hover:underline">My Day<ArrowRight className="h-3 w-3" /></Link>}>
          {(day.data ?? []).length === 0 ? <Empty icon={<CalendarCheck2 className="h-5 w-5" />} title="Nothing queued" body="Add stakeholders to accounts to build your calling list." /> : (
            <ul className="space-y-1.5">
              {[...due, ...fresh].slice(0, 6).map((x, i) => (
                <li key={i}><Link to="/my-day" className="flex items-center gap-3 rounded-xl border border-line/70 px-3 py-2 transition-colors hover:border-brand-forest/30 hover:bg-brand-forest-50/50">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', x.section === 'OVERDUE' ? 'bg-danger' : x.section === 'DUE_TODAY' ? 'bg-brand-forest' : 'bg-brand-mint')} />
                  <span className="min-w-0 flex-1 truncate text-[13px]"><b className="font-semibold">{x.stakeholderName ?? x.accountName}</b> <span className="text-ink-muted">· {x.accountName}</span></span>
                  <span className="text-[11px] text-ink-muted">{x.section === 'UNTOUCHED' ? 'New' : relTime(x.dueAt)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <HeatmapCard s={s} k="calls" title="Calling streak" className="xl:col-span-2" />
        <LiveFeedCard feed={pulse.data?.feed} />
      </div>
      <AddAccountModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

// ---------------------------------------------------------------- AE

function AeHome({ preset, setPreset, first }: HomeProps) {
  const [outcomeFor, setOutcomeFor] = useState<MeetingRef | null>(null);
  const pulse = usePulse(preset);
  const { data: d } = useQuery({ queryKey: ['dashboard', 'ae', preset], queryFn: () => api.get<Record<string, never>>('/api/dashboards/ae', { preset }), ...LIVE });
  const overdue = useQuery({ queryKey: ['overdue-outcomes'], queryFn: () => api.get<{ id: string; level: 'L1' | 'L2' | 'L3' | 'OTHER'; scheduledStart: string; accountId: string; accountName: string }[]>('/api/meetings/overdue-outcomes'), ...LIVE });
  const flagged = useQuery({ queryKey: ['to-be-moved'], queryFn: () => api.get<{ id: string; name: string; stage: LifecycleStage; lastActivityAt?: string }[]>('/api/lifecycle/to-be-moved') });
  const s = pulse.data?.series;
  const mrr = ((d?.mrrByTemperature as unknown as { temperature: string; count: number; mrr: number }[] | undefined) ?? []);
  const openMrr = (pulse.data?.stageMix ?? []).filter((m) => !['WON', 'LOST', 'PROSPECT'].includes(m.stage)).reduce((a, m) => a + Number(m.mrr), 0);
  const tempColor: Record<string, string> = { HOT: C.forest, WARM: C.mint, COLD: C.navy };

  return (
    <div className="space-y-4">
      {(overdue.data?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-3 rounded-[22px] border border-brand-forest/20 bg-brand-forest-50/70 p-4 md:flex-row md:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-forest text-white"><Video className="h-5 w-5" /></span>
          <div className="flex-1"><p className="text-[14px] font-semibold">{overdue.data!.length} meeting{overdue.data!.length > 1 ? 's need' : ' needs'} an outcome</p>
            <p className="text-[12.5px] text-ink-muted">Stages and tasks update only after you record what happened.</p></div>
          <div className="flex flex-wrap gap-2">
            {overdue.data!.slice(0, 3).map((m) => (
              <Button key={m.id} size="sm" variant="primary" onClick={() => setOutcomeFor({ id: m.id, level: m.level, accountId: m.accountId, accountName: m.accountName })}>{m.level} · {m.accountName}</Button>
            ))}
          </div>
        </div>
      )}

      <CommandHero title={`${greeting()}, ${first}`} subtitle={`Your pipeline pulse · ${today()}`} preset={preset} onPreset={setPreset}
        pulse={s} updatedAt={pulse.dataUpdatedAt} fetching={pulse.isFetching} onRefresh={() => pulse.refetch()}
        kpis={[
          { label: 'Active accounts', value: d?.active ?? '—', hint: d ? `${d.l1Pending} L1 · ${d.l2Pending} L2 · ${d.l3Pending} L3 pending` : undefined, to: '/pipeline' },
          { label: 'Open MRR', value: inr(openMrr), hint: 'Expected, across open deals' },
          { label: 'Meetings done', value: sum(s, 'meetingsDone'), spark: 'meetingsDone', delta: delta(s, 'meetingsDone') },
          { label: 'Won', value: sum(s, 'wins'), spark: 'wins', delta: delta(s, 'wins'), hint: d?.followUpsOverdue ? `${d.followUpsOverdue} follow-ups overdue` : `${d?.followUpsDueToday ?? 0} follow-ups today`, to: '/tasks' },
        ]} />

      <div className="grid gap-4 xl:grid-cols-3">
        <StageMixCard mix={pulse.data?.stageMix} title="Your pipeline by stage" className="xl:col-span-2" />
        <ChartCard title="Expected MRR by temperature" subtitle="Where the money is">
          {!mrr.length ? <EmptyChart>Set temperature and MRR on your opportunities to see this.</EmptyChart> : (
            <Donut height={190} fmt={(v) => inr(v)} center={inr(mrr.reduce((a, m) => a + Number(m.mrr), 0))} sub="open MRR"
              data={mrr.map((m) => ({ name: `${humanize(m.temperature)} · ${m.count}`, value: Number(m.mrr), color: tempColor[m.temperature] ?? C.slate }))} />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ActivityTrendCard s={s} mode="meetings" className="xl:col-span-2" />
        <ChartCard title="Workload" subtitle="What needs you next">
          <ul className="space-y-3">
            {[['L1 pending', d?.l1Pending], ['L2 pending', d?.l2Pending], ['L3 pending', d?.l3Pending], ['Need multithreading', d?.accountsNeedingMultithreading], ['Follow-ups today', d?.followUpsDueToday]].map(([l, v]) => (
              <li key={l as string}>
                <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-ink-soft">{l}</span><span className="font-semibold tabular-nums">{Number(v ?? 0)}</span></div>
                <Meter value={Number(v ?? 0)} max={Math.max(1, Number(d?.active ?? 1))} />
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title={<span className="flex items-center gap-2"><Flag className="h-4 w-4 text-brand-forest" />Flagged — keep or move to inactive</span>}>
          {(flagged.data ?? []).length === 0 ? <EmptyChart>No accounts flagged. Nice.</EmptyChart> : (
            <ul className="space-y-1.5">
              {flagged.data!.slice(0, 7).map((a) => (
                <li key={a.id}><Link to={`/accounts/${a.id}`} className="flex items-center gap-3 rounded-xl border border-line/70 px-3 py-2 text-[13px] transition-colors hover:bg-brand-forest-50/50">
                  <span className="flex-1 truncate font-medium">{a.name}</span><span className="text-[11px] text-ink-muted">{stageLabel[a.stage]} · {relTime(a.lastActivityAt)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </ChartCard>
        <TargetsCard targets={d?.targets as unknown as Achievement[] | undefined} />
        <LiveFeedCard feed={pulse.data?.feed} />
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

const AE_STAGES: LifecycleStage[] = ['SQL', 'L1', 'L2', 'L3', 'NEGOTIATION', 'WON'];

function LeaderHome({ preset, setPreset, first }: HomeProps) {
  const navigate = useNavigate();
  const pulse = usePulse(preset);
  const { data: d } = useQuery({ queryKey: ['dashboard', 'lead', preset], queryFn: () => api.get<Leadership>('/api/dashboards/leadership', { preset }), ...LIVE });
  const queue = useQuery({ queryKey: ['queue'], queryFn: () => api.get<QueueRow[]>('/api/assignment/queue'), ...LIVE });
  const hygiene = useQuery({ queryKey: ['dashboard', 'hygiene'], queryFn: () => api.get<Record<string, unknown[]>>('/api/dashboards/hygiene'), ...LIVE });
  const s = pulse.data?.series;
  const active = d?.activeVsInactive.find((x) => x.status === 'ACTIVE')?.count ?? 0;
  const inactive = d?.activeVsInactive.find((x) => x.status === 'INACTIVE')?.count ?? 0;
  const toReview = queue.data?.filter((q) => q.status !== 'QUALIFIED_SQL').length ?? 0;
  const toAssign = queue.data?.filter((q) => q.status === 'QUALIFIED_SQL').length ?? 0;
  const stuck = d?.stuckAccounts.reduce((a, x) => a + Number(x.count), 0) ?? 0;

  const byAe = Object.values((d?.opportunitiesByAe ?? []).reduce<Record<string, Record<string, number | string>>>((m, r) => {
    m[r.ae] ??= { ae: r.ae, total: 0 };
    m[r.ae][r.stage] = Number(r.count); m[r.ae].total = Number(m[r.ae].total) + Number(r.count);
    return m;
  }, {})).sort((a, b) => Number(b.total) - Number(a.total));
  const hygieneRows = [['noNextStep', 'Accounts with no next step'], ['overdueTasksByUser', 'People with overdue tasks'], ['meetingsWithoutOutcome', 'Meetings without outcome'],
    ['stagnationReasonMissing', 'Stuck without a reason'], ['inactiveMissingReasonDetail', 'Inactive missing details']] as const;
  const hygieneTotal = hygieneRows.reduce((a, [k]) => a + ((hygiene.data?.[k] as unknown[] | undefined)?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      <CommandHero title={`${greeting()}, ${first}`} subtitle={`Team pulse · ${today()}`} preset={preset} onPreset={setPreset}
        pulse={s} updatedAt={pulse.dataUpdatedAt} fetching={pulse.isFetching} onRefresh={() => { pulse.refetch(); queue.refetch(); }}
        kpis={[
          { label: 'Pipeline MRR', value: d ? inr(d.pipelineMrr) : '—', hint: `${active} active · ${inactive} inactive`, to: '/pipeline' },
          { label: 'Team calls', value: sum(s, 'calls'), spark: 'calls', delta: delta(s, 'calls'), hint: `${sum(s, 'connects')} connects` },
          { label: 'SQLs', value: sum(s, 'sqls'), spark: 'sqls', delta: delta(s, 'sqls'), hint: `${toReview} to review · ${toAssign} to assign`, to: '/sql' },
          { label: 'Won', value: sum(s, 'wins'), spark: 'wins', delta: delta(s, 'wins'), hint: stuck ? `${stuck} stuck past threshold` : 'Nothing stuck' },
        ]}>
        {(toReview + toAssign) > 0 && (
          <button onClick={() => navigate('/sql')} className="mt-4 flex w-full items-center gap-3 rounded-[20px] border border-brand-mint/25 bg-brand-mint/10 p-4 text-left transition-colors hover:bg-brand-mint/15">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-mint text-brand-night"><ClipboardCheck className="h-4 w-4" /></span>
            <span className="flex-1 text-[13.5px]"><b>{toReview} SQL{toReview === 1 ? '' : 's'} to review</b>{toAssign > 0 && <> and <b>{toAssign} waiting for an AE</b></>}</span>
            <span className="flex items-center gap-1 text-xs font-semibold text-brand-mint">Open queue<ArrowRight className="h-3.5 w-3.5" /></span>
          </button>
        )}
      </CommandHero>

      <div className="grid gap-4 xl:grid-cols-3">
        <ActivityTrendCard s={s} mode="team" className="xl:col-span-2" />
        <OutcomeMixCard mix={pulse.data?.outcomeMix} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Funnel" subtitle="Accounts reaching each stage in the period · conversion from the step before">
          {!d ? <div className="h-60 animate-pulse rounded-2xl bg-canvas" /> : <Funnel steps={d.funnel.map((f) => ({ stage: f.stage, count: Number(f.count), pct: f.conversionFromPreviousPct }))} />}
        </ChartCard>
        <StageMixCard mix={pulse.data?.stageMix} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Pipeline by AE" subtitle="Open deals per stage" className="xl:col-span-2">
          {!byAe.length ? <EmptyChart>No pipeline accounts yet.</EmptyChart> : (
            <GroupedBars data={byAe} x="ae" stacked horizontal height={Math.max(160, byAe.length * 64)}
              series={AE_STAGES.map((st, i) => ({ key: st, name: stageLabel[st], color: [C.pale, C.sage, C.mint, C.forest2, C.forest, C.navy][i] }))} />
          )}
        </ChartCard>
        <ChartCard title="Wins and losses" subtitle="Closed in the period">
          {!d?.winsAndLosses.length ? <EmptyChart>Nothing closed in this period.</EmptyChart> : (
            <Donut height={180} data={d.winsAndLosses.map((w) => ({ name: humanize(w.outcome), value: Number(w.count), color: w.outcome === 'LOST' ? C.slate : C.mint }))} sub="closed" />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Average days in stage" subtitle="How long deals sit before moving">
          {!d?.averageDaysInStage.length ? <EmptyChart /> : (
            <GroupedBars horizontal height={Math.max(180, d.averageDaysInStage.length * 40)} x="stage" fmt={(v) => `${v} days`}
              data={d.averageDaysInStage.map((x) => ({ stage: stageLabel[x.stage] ?? x.stage, days: Number(x.avgDays) }))}
              series={[{ key: 'days', name: 'Avg days', color: C.forest }]} />
          )}
        </ChartCard>
        <HeatmapCard s={s} k="calls" title="Team calling heatmap" />
        <ChartCard title="Data hygiene" subtitle={hygieneTotal ? `${hygieneTotal} things to fix` : 'All clean'}
          action={<Link to="/reports" className="text-xs font-semibold text-brand-forest hover:underline">Reports</Link>}>
          <ul className="space-y-3">
            {hygieneRows.map(([k, label]) => {
              const n = (hygiene.data?.[k] as unknown[] | undefined)?.length ?? 0;
              return (
                <li key={k}>
                  <div className="mb-1 flex items-center justify-between text-[12.5px]"><span className="flex items-center gap-1.5 text-ink-soft">{n > 0 && <AlertTriangle className="h-3.5 w-3.5 text-brand-forest" />}{label}</span>
                    <span className={cn('rounded-full px-2 text-[11px] font-semibold tabular-nums', n ? 'bg-brand-forest text-white' : 'bg-brand-forest-50 text-brand-forest')}>{hygiene.isLoading ? '…' : n}</span></div>
                  <Meter value={n} max={Math.max(1, ...hygieneRows.map(([kk]) => (hygiene.data?.[kk] as unknown[] | undefined)?.length ?? 0))} />
                </li>
              );
            })}
          </ul>
        </ChartCard>
      </div>

      <LiveFeedCard feed={pulse.data?.feed} />
    </div>
  );
}

// ---------------------------------------------------------------- shared

function TargetsCard({ targets }: { targets?: Achievement[] }) {
  return (
    <ChartCard title="Targets this month" subtitle="Live achievement">
      {!targets?.length ? <EmptyChart>No targets yet — your manager sets them under Reports.</EmptyChart> : (
        <div className="grid grid-cols-2 gap-3 pt-1">
          {targets.slice(0, 4).map((t) => (
            <RadialGauge key={t.metric} value={Number(t.pct ?? 0)} label={humanize(t.metric)} size={110}
              sub={t.metric === 'MRR' ? `${inr(t.actual)} / ${inr(t.target)}` : `${Number(t.actual)} / ${Number(t.target)}`} />
          ))}
        </div>
      )}
    </ChartCard>
  );
}

function Mini({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return <div><p className={cn('font-display text-[20px] font-medium tabular-nums', warn && 'text-[#B07615]')}>{value}</p><p className="text-[11px] text-ink-muted">{label}</p></div>;
}

