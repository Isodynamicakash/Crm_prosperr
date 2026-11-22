import { Link } from 'react-router-dom';
import { CheckCircle2, MailX, Network } from 'lucide-react';
import { cn } from '@/lib/cn';
import { humanize, relTime } from '@/lib/format';
import { EntityTile } from '@/components/ui/ui';
import { stageLabel } from '@/components/ui/status';
import type { LifecycleStage } from '@/lib/types';
import { C, ChartCard, Donut, EmptyChart, GroupedBars, Meter, RadialGauge, SERIES } from '@/components/charts/kit';

/*
 * One purpose-built layout per report. Every chart reads the real report payload; nothing is invented.
 */
type Row = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0);
const label = (s: unknown) => (typeof s === 'string' && /^[A-Z_]+$/.test(s) ? (stageLabel[s as LifecycleStage] ?? humanize(s)) : String(s ?? '—'));

function Kpis({ items }: { items: { label: string; value: React.ReactNode; hint?: string; accent?: boolean }[] }) {
  return (
    <div className={cn('grid gap-3', items.length >= 4 ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3')}>
      {items.map((k) => (
        <div key={k.label} className={cn('relative overflow-hidden rounded-[20px] border px-4 py-4', k.accent ? 'border-transparent bg-[#141614] text-paper' : 'border-line/80 bg-white')}>
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-forest to-brand-mint" />
          <p className={cn('text-[11px] font-medium uppercase tracking-[0.12em]', k.accent ? 'text-paper/50' : 'text-ink-muted')}>{k.label}</p>
          <p className="mt-2 font-display text-[30px] font-medium leading-none tracking-[-0.04em] tabular-nums">{k.value}</p>
          {k.hint && <p className={cn('mt-1.5 text-[11.5px]', k.accent ? 'text-paper/50' : 'text-ink-muted')}>{k.hint}</p>}
        </div>
      ))}
    </div>
  );
}

function AllClear({ icon: Icon, title, body }: { icon: typeof CheckCircle2; title: string; body: string }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-[#141614] p-8 text-center text-paper">
      <div className="absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-brand-mint/20 blur-3xl" />
      <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-mint text-brand-night shadow-[0_0_30px_rgba(35,178,74,.5)]"><Icon className="h-6 w-6" /></span>
      <p className="relative mt-4 font-display text-[22px] font-medium tracking-[-0.03em]">{title}</p>
      <p className="relative mx-auto mt-1 max-w-md text-[13px] text-paper/60">{body}</p>
    </div>
  );
}

// ---------------------------------------------------------------- L1 done, not in L2

export function L1Report({ rows }: { rows: Row[] }) {
  if (!rows.length) return <AllClear icon={CheckCircle2} title="Every L1 is moving" body="No account is sitting at L1 done without progressing to L2." />;
  const totalLic = rows.reduce((a, r) => a + n(r.licensePotential), 0);
  const multi = rows.filter((r) => r.multithreadingStarted).length;
  const byAe = Object.entries(rows.reduce<Record<string, number>>((m, r) => ({ ...m, [String(r.aeOwner ?? 'Unassigned')]: (m[String(r.aeOwner ?? 'Unassigned')] ?? 0) + 1 }), {}));
  const stalled = (r: Row) => (r.lastInteraction ? Math.floor((Date.now() - new Date(String(r.lastInteraction)).getTime()) / 864e5) : null);
  return (
    <div className="space-y-4">
      <Kpis items={[
        { label: 'Stalled accounts', value: rows.length, hint: 'L1 done, no L2 yet', accent: true },
        { label: 'Licences at stake', value: totalLic.toLocaleString('en-IN'), hint: 'Combined licence potential' },
        { label: 'Multithreading started', value: `${Math.round((100 * multi) / rows.length)}%`, hint: `${multi} of ${rows.length} accounts` },
        { label: 'No SPOC named', value: rows.filter((r) => !r.spocDesignation).length, hint: 'Find the champion' },
      ]} />
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Licence potential at stake" subtitle="Biggest stalled deals first" className="xl:col-span-2">
          <GroupedBars horizontal height={Math.max(170, rows.length * 46)} x="account" fmt={(v) => `${v.toLocaleString('en-IN')} licences`}
            data={[...rows].sort((a, b) => n(b.licensePotential) - n(a.licensePotential)).map((r) => ({ account: String(r.account), licences: n(r.licensePotential) }))}
            series={[{ key: 'licences', name: 'Licences', color: C.forest }]} />
        </ChartCard>
        <ChartCard title="By AE" subtitle="Who owns the stalled deals">
          <Donut height={180} sub="accounts" data={byAe.map(([k, v], i) => ({ name: k, value: v, color: SERIES[i % SERIES.length] }))} />
        </ChartCard>
      </div>
      <ChartCard title="Stalled accounts" subtitle="Open one to set the next step">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const d = stalled(r);
            return (
              <Link key={String(r.accountId)} to={`/accounts/${r.accountId}`} className="group rounded-[18px] border border-line/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-forest/25 hover:shadow-[0_16px_30px_-22px_rgba(5,63,26,.6)]">
                <div className="flex items-center gap-3"><EntityTile name={String(r.account)} /><div className="min-w-0"><p className="truncate font-semibold group-hover:text-brand-forest">{String(r.account)}</p><p className="text-[11.5px] text-ink-muted">{String(r.aeOwner ?? '—')} · {humanize(String(r.sizeBucket ?? ''))}</p></div></div>
                <div className="mt-3 flex items-center justify-between text-[11.5px]"><span className="text-ink-muted">Last touched</span><span className="font-semibold">{r.lastInteraction ? relTime(String(r.lastInteraction)) : '—'}</span></div>
                <div className="mt-1.5"><Meter value={Math.min(30, d ?? 30)} max={30} color={d != null && d > 14 ? C.navy : C.forest} /></div>
                <p className="mt-2 text-[11px] text-ink-muted">{r.multithreadingStarted ? 'Multithreading started' : 'Only one contact engaged'}{r.nextFollowUp ? ` · next ${relTime(String(r.nextFollowUp))}` : ''}</p>
              </Link>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}

// ---------------------------------------------------------------- Stakeholder coverage

export function CoverageReport({ data }: { data: Record<string, Row[]> }) {
  const none = data.noFinanceOrChroEngagement ?? [], junior = data.juniorOnly ?? [];
  if (!none.length && !junior.length) return <AllClear icon={Network} title="Every pipeline account is covered" body="Each account has a senior Finance or HR contact engaged, and none rely on junior contacts only." />;
  const List = ({ title, rows }: { title: string; rows: Row[] }) => (
    <ChartCard title={title} subtitle={`${rows.length} account${rows.length === 1 ? '' : 's'}`}>
      {!rows.length ? <EmptyChart>None — nice.</EmptyChart> : (
        <ul className="space-y-1.5">{rows.map((r, i) => (
          <li key={i}><Link to={`/accounts/${r.accountId ?? r.id}`} className="flex items-center gap-3 rounded-2xl border border-line/70 px-3 py-2.5 hover:border-brand-forest/25">
            <EntityTile name={String(r.account ?? r.name)} size="sm" /><span className="flex-1 truncate text-[13px] font-semibold">{String(r.account ?? r.name)}</span>
            <span className="text-[11px] text-ink-muted">{label(r.stage)}</span></Link></li>))}</ul>
      )}
    </ChartCard>
  );
  return (
    <div className="space-y-4">
      <Kpis items={[{ label: 'No Finance / CHRO engaged', value: none.length, accent: true }, { label: 'Junior contacts only', value: junior.length }, { label: 'Accounts to multithread', value: new Set([...none, ...junior].map((r) => r.accountId ?? r.id)).size }]} />
      <div className="grid gap-4 lg:grid-cols-2"><List title="No Finance or CHRO engagement" rows={none} /><List title="Junior contacts only" rows={junior} /></div>
    </div>
  );
}

// ---------------------------------------------------------------- Inactive reasons

export function InactiveReport({ data }: { data: Record<string, Row[]> }) {
  const current = data.currentInactiveByReasonAndStage ?? [], moved = data.movedInactiveByMonth ?? [], react = data.reactivationsByReason ?? [];
  if (!current.length && !moved.length) return <AllClear icon={CheckCircle2} title="Nothing has gone inactive" body="Every account is still active." />;
  const byReason = Object.entries(current.reduce<Record<string, number>>((m, r) => ({ ...m, [String(r.reason)]: (m[String(r.reason)] ?? 0) + n(r.count) }), {})).sort((a, b) => b[1] - a[1]);
  const stages = [...new Set(current.map((r) => String(r.stage)))];
  const byStage = byReason.map(([reason]) => ({ reason, ...Object.fromEntries(stages.map((st) => [st, current.filter((r) => r.reason === reason && r.stage === st).reduce((a, r) => a + n(r.count), 0)])) }));
  const months = [...new Set(moved.map((r) => String(r.month)))].sort();
  const trend = months.map((m) => ({ month: new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), moved: moved.filter((r) => r.month === m).reduce((a, r) => a + n(r.count), 0) }));
  const total = byReason.reduce((a, [, v]) => a + v, 0);
  return (
    <div className="space-y-4">
      <Kpis items={[
        { label: 'Inactive now', value: total, accent: true, hint: `${byReason.length} different reasons` },
        { label: 'Top reason', value: byReason[0]?.[0] ?? '—', hint: byReason[0] ? `${byReason[0][1]} account${byReason[0][1] === 1 ? '' : 's'}` : undefined },
        { label: 'Reactivated', value: react.reduce((a, r) => a + n(r.count), 0), hint: 'Brought back to active' },
      ]} />
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Why accounts go inactive" subtitle="Current inactive accounts by reason">
          <Donut height={210} sub="inactive" data={byReason.map(([k, v], i) => ({ name: k, value: v, color: SERIES[i % SERIES.length] }))} />
        </ChartCard>
        <ChartCard title="Reason × stage" subtitle="Where in the funnel each reason hits">
          <GroupedBars horizontal stacked height={Math.max(200, byStage.length * 40)} x="reason" data={byStage}
            series={stages.map((st, i) => ({ key: st, name: label(st), color: SERIES[i % SERIES.length] }))} />
        </ChartCard>
      </div>
      <ChartCard title="Moved to inactive per month" subtitle="Is churn from the funnel rising or falling?">
        <GroupedBars height={220} x="month" data={trend} series={[{ key: 'moved', name: 'Moved inactive', color: C.forest }]} />
      </ChartCard>
    </div>
  );
}

// ---------------------------------------------------------------- Workload

export function WorkloadReport({ data }: { data: Record<string, Row[]> }) {
  const current = data.current ?? [], assign = data.assignments ?? [];
  const maxLoad = Math.max(1, ...current.map((r) => n(r.weightedLoad)));
  const totalAssigned = assign.reduce((a, r) => a + n(r.count), 0);
  const followed = assign.reduce((a, r) => a + n(r.followedRecommendation), 0);
  return (
    <div className="space-y-4">
      <Kpis items={[
        { label: 'Open deals', value: current.reduce((a, r) => a + n(r.active), 0), accent: true, hint: `${current.length} AEs` },
        { label: 'Heaviest load', value: current.length ? String([...current].sort((a, b) => n(b.weightedLoad) - n(a.weightedLoad))[0].ae) : '—', hint: `${maxLoad} weighted` },
        { label: 'Assignments', value: totalAssigned, hint: `${assign.reduce((a, r) => a + n(r.reassignments), 0)} reassignments` },
        { label: 'Followed recommendation', value: totalAssigned ? `${Math.round((100 * followed) / totalAssigned)}%` : '—', hint: 'Capacity-based suggestion used' },
      ]} />
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Pipeline per AE" subtitle="Open deals by stage" className="xl:col-span-2">
          {!current.length ? <EmptyChart /> : (
            <GroupedBars stacked horizontal height={Math.max(180, current.length * 70)} x="ae" data={current.map((r) => ({ ae: String(r.ae), l1Pending: n(r.l1Pending), l2: n(r.l2), l3: n(r.l3), negotiation: n(r.negotiation) }))}
              series={[{ key: 'l1Pending', name: 'L1 pending', color: C.pale }, { key: 'l2', name: 'L2', color: C.mint }, { key: 'l3', name: 'L3', color: C.forest2 }, { key: 'negotiation', name: 'Negotiation', color: C.forest }]} />
          )}
        </ChartCard>
        <ChartCard title="Weighted load" subtitle="L2+ deals count 1.5×">
          <div className="grid grid-cols-2 gap-3">
            {current.map((r) => <RadialGauge key={String(r.ae)} value={(100 * n(r.weightedLoad)) / maxLoad} label={String(r.ae)} sub={`${n(r.weightedLoad)} load · ${n(r.total)} deals`} size={104} />)}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Ageing

const BUCKETS = ['0-15', '16-30', '31-60', '60+'];

export function AgeingReport({ data }: { data: Record<string, Row[]> }) {
  const ORDER = ['PROSPECT', 'SQL', 'L1', 'MULTITHREADING', 'L2', 'L3', 'NEGOTIATION', 'WON', 'IMPLEMENTATION', 'LOST'];
  const rows = [...(data.ageingByStage ?? [])].sort((a, b) => ORDER.indexOf(String(a.stage)) - ORDER.indexOf(String(b.stage)));
  const slowest = [...rows].sort((a, b) => (n(b['16-30']) + 2 * n(b['31-60']) + 3 * n(b['60+'])) - (n(a['16-30']) + 2 * n(a['31-60']) + 3 * n(a['60+'])))[0];
  const max = Math.max(1, ...rows.flatMap((r) => BUCKETS.map((b) => n(r[b]))));
  const old = rows.reduce((a, r) => a + n(r['31-60']) + n(r['60+']), 0);
  const all = rows.reduce((a, r) => a + BUCKETS.reduce((x, b) => x + n(r[b]), 0), 0);
  return (
    <div className="space-y-4">
      <Kpis items={[
        { label: 'Accounts tracked', value: all, accent: true },
        { label: 'Fresh (≤ 15 days)', value: rows.reduce((a, r) => a + n(r['0-15']), 0) },
        { label: 'Ageing (> 30 days)', value: old, hint: all ? `${Math.round((100 * old) / all)}% of accounts` : undefined },
        { label: 'Slowest stage', value: slowest && n(slowest['16-30']) + n(slowest['31-60']) + n(slowest['60+']) ? label(slowest.stage) : 'None', hint: 'Most accounts past 15 days' },
      ]} />
      <ChartCard title="Age heatmap" subtitle="Days in the current stage — darker means more accounts">
        <div className="overflow-x-auto">
          <div className="grid min-w-[520px] gap-1.5" style={{ gridTemplateColumns: '130px repeat(4, minmax(0,1fr))' }}>
            <span />{BUCKETS.map((b) => <span key={b} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{b} days</span>)}
            {rows.map((r) => (
              <div key={String(r.stage)} className="contents">
                <span className="flex items-center text-[13px] font-semibold">{label(r.stage)}</span>
                {BUCKETS.map((b, i) => {
                  const v = n(r[b]); const t = v / max;
                  return (
                    <span key={b} className="flex h-12 items-center justify-center rounded-xl font-display text-[16px] font-medium tabular-nums transition-transform hover:scale-[1.04]"
                      style={{ background: v ? (i >= 2 ? `rgba(32,46,100,${0.18 + t * 0.8})` : `rgba(5,63,26,${0.12 + t * 0.85})`) : '#F1F2F1', color: t > 0.45 ? '#fff' : '#0D0D0D' }}>{v || ''}</span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 flex gap-4 text-[11px] text-ink-muted"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-brand-forest" />Fresh</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-brand-navy" />Older than 30 days</span></p>
      </ChartCard>
      <ChartCard title="Age mix per stage">
        <GroupedBars stacked height={260} x="stage" data={rows.map((r) => ({ stage: label(r.stage), ...Object.fromEntries(BUCKETS.map((b) => [b, n(r[b])])) }))}
          series={BUCKETS.map((b, i) => ({ key: b, name: `${b} days`, color: [C.pale, C.mint, C.forest, C.navy][i] }))} />
      </ChartCard>
    </div>
  );
}

// ---------------------------------------------------------------- SQL quality

export function SqlQualityReport({ data }: { data: Record<string, Row[]> }) {
  const byBdr = data.byBdr ?? [], byLevel = data.byStakeholderLevel ?? [], byLoc = data.byLocationPriority ?? [];
  const sub = byBdr.reduce((a, r) => a + n(r.submitted), 0), app = byBdr.reduce((a, r) => a + n(r.approved), 0), rej = byBdr.reduce((a, r) => a + n(r.rejected), 0);
  return (
    <div className="space-y-4">
      <Kpis items={[
        { label: 'Approval rate', value: sub ? `${Math.round((100 * app) / sub)}%` : '—', accent: true, hint: `${app} of ${sub} SQLs` },
        { label: 'Submitted', value: sub }, { label: 'Rejected', value: rej, hint: 'Not ICP' },
        { label: 'AE corrections', value: byBdr.reduce((a, r) => a + n(r.aeCorrections), 0), hint: 'Fixed after hand-off' },
      ]} />
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="SQLs per BDR" subtitle="Submitted, approved and rejected" className="xl:col-span-2">
          <GroupedBars height={260} x="bdr" data={byBdr.map((r) => ({ bdr: String(r.bdr), submitted: n(r.submitted), approved: n(r.approved), rejected: n(r.rejected) }))}
            series={[{ key: 'submitted', name: 'Submitted', color: C.pale }, { key: 'approved', name: 'Approved', color: C.forest }, { key: 'rejected', name: 'Rejected', color: C.navy }]} />
        </ChartCard>
        <ChartCard title="Approval rate by BDR">
          <div className="grid grid-cols-2 gap-3">
            {byBdr.map((r) => <RadialGauge key={String(r.bdr)} size={100} value={n(r.submitted) ? (100 * n(r.approved)) / n(r.submitted) : 0} label={String(r.bdr)} sub={`${n(r.approved)} / ${n(r.submitted)}`} />)}
          </div>
        </ChartCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="By location priority" subtitle="P0 cities pass outright; P1 needs intent">
          <Donut height={190} sub="SQLs" data={byLoc.map((r, i) => ({ name: String(r.locationPriority), value: n(r.submitted), color: [C.forest, C.mint, C.slate][i % 3] }))} />
        </ChartCard>
        <ChartCard title="By stakeholder level" subtitle="Who qualified the SQL">
          <Donut height={190} sub="SQLs" data={byLevel.map((r, i) => ({ name: String(r.level), value: n(r.submitted), color: SERIES[i % SERIES.length] }))} />
        </ChartCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Email sequences

export function SequenceReport({ rows }: { rows: Row[] }) {
  const sent = rows.reduce((a, r) => a + n(r.sent), 0), replies = rows.reduce((a, r) => a + n(r.repliesAfterStep), 0);
  return (
    <div className="space-y-4">
      <Kpis items={[
        { label: 'Emails sent', value: sent, accent: true, hint: `${rows.length} sequence steps` },
        { label: 'Replies', value: replies }, { label: 'Reply rate', value: sent ? `${Math.round((100 * replies) / sent)}%` : '—' },
      ]} />
      {!sent ? <AllClear icon={MailX} title="No sequence emails sent yet" body="Once BDRs start sequences from an account, sends and replies per step show up here." /> : (
        <ChartCard title="Sends and replies per step" subtitle="Where prospects engage">
          <GroupedBars height={260} x="step" data={rows.map((r) => ({ step: `Step ${r.step} · ${humanize(String(r.template))}`, sent: n(r.sent), replies: n(r.repliesAfterStep) }))}
            series={[{ key: 'sent', name: 'Sent', color: C.pale }, { key: 'replies', name: 'Replies', color: C.forest }]} />
        </ChartCard>
      )}
      <ChartCard title="Sequence steps">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {rows.map((r) => (
            <div key={String(r.step)} className="rounded-[18px] border border-line/80 p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-forest font-display text-[13px] text-white">{String(r.step)}</span>
              <p className="mt-2 font-semibold">{humanize(String(r.template))}</p>
              <p className="text-[12px] text-ink-muted">{n(r.sent)} sent · {n(r.repliesAfterStep)} replies</p>
              <div className="mt-2"><Meter value={n(r.replyRatePct)} max={100} /></div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}

