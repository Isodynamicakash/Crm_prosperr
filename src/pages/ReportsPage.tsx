import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, Hourglass, Layers, Mail, Network, PauseCircle, ShieldCheck, Target, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useUsers } from '@/lib/queries';
import { cn } from '@/lib/cn';
import { fmtDate, fmtDateTime, humanize, inr } from '@/lib/format';
import type { Achievement } from '@/lib/types';
import { Button, Card, CardHeader, Empty, EntityTile, Field, Input, PageHeader, SectionHead, Select, SkeletonRows } from '@/components/ui/ui';
import { ChartCard, Meter, RadialGauge } from '@/components/charts/kit';
import { AgeingReport, CoverageReport, InactiveReport, L1Report, SequenceReport, SqlQualityReport, WorkloadReport } from '@/features/reports/ReportViews';

type ReportKey = 'targets' | 'l1' | 'coverage' | 'inactive' | 'workload' | 'ageing' | 'sql' | 'sequences';
const REPORTS: { key: ReportKey; label: string; hint: string; icon: typeof Target }[] = [
  { key: 'targets', label: 'Targets', hint: 'Set monthly targets and track achievement live.', icon: Target },
  { key: 'l1', label: 'L1 done, not in L2', hint: 'Accounts that had an L1 but haven’t progressed.', icon: Hourglass },
  { key: 'coverage', label: 'Stakeholder coverage', hint: 'Junior-only accounts and missing senior Finance/HR.', icon: Network },
  { key: 'inactive', label: 'Inactive reasons', hint: 'Why accounts go inactive, by reason and owner.', icon: PauseCircle },
  { key: 'workload', label: 'Workload', hint: 'Open deals and weighted load per AE.', icon: Layers },
  { key: 'ageing', label: 'Ageing', hint: 'How long accounts sit in each stage.', icon: Timer },
  { key: 'sql', label: 'SQL quality', hint: 'Approval and rejection patterns per BDR.', icon: ShieldCheck },
  { key: 'sequences', label: 'Email sequences', hint: 'Sends, replies and bounces per sequence step.', icon: Mail },
];

export default function ReportsPage() {
  const [key, setKey] = useState<ReportKey>('targets');
  const r = REPORTS.find((x) => x.key === key)!;
  return (
    <div>
      <PageHeader title="Reports" icon={<BarChart3 />} eyebrow="Analytics" subtitle="Every number links back to the accounts behind it." />
      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        <nav className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 scrollbar-none sm:mx-0 sm:px-0 lg:sticky lg:top-2 lg:block lg:space-y-1 lg:self-start lg:overflow-visible lg:pb-0">
          {REPORTS.map((x) => (
            <button key={x.key} onClick={() => setKey(x.key)}
              className={cn('group flex shrink-0 items-center gap-2.5 rounded-2xl border border-line/80 bg-white px-2.5 py-2 text-left transition-all hover:bg-white/80 lg:w-full lg:gap-3 lg:border-transparent lg:bg-transparent lg:px-3 lg:py-2.5', key === x.key && 'border-transparent bg-brand-forest text-white shadow-[0_10px_24px_-12px_rgba(5,63,26,.8)] hover:bg-brand-forest lg:bg-brand-forest lg:hover:bg-brand-forest')}>
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', key === x.key ? 'bg-brand-mint text-brand-night' : 'bg-white text-brand-forest ring-1 ring-line')}><x.icon className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block truncate whitespace-nowrap text-[13px] font-semibold">{x.label}</span><span className={cn('hidden truncate text-[11px] lg:block', key === x.key ? 'text-white/60' : 'text-ink-muted')}>{x.hint}</span></span>
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          <SectionHead icon={<r.icon />} title={r.label} subtitle={r.hint} />
          {key === 'targets' ? <Targets /> : <GenericReport k={key} />}
        </div>
      </div>
    </div>
  );
}

const ENDPOINT: Record<Exclude<ReportKey, 'targets'>, string> = {
  l1: '/api/reports/l1-not-progressed', coverage: '/api/reports/stakeholder-coverage', inactive: '/api/reports/inactive-reasons',
  workload: '/api/reports/workload', ageing: '/api/reports/ageing', sql: '/api/reports/sql-quality', sequences: '/api/reports/sequence-performance',
};

function DedicatedView({ k, data }: { k: Exclude<ReportKey, 'targets'>; data: unknown }) {
  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
  const obj = (Array.isArray(data) ? {} : data ?? {}) as Record<string, Record<string, unknown>[]>;
  switch (k) {
    case 'l1': return <L1Report rows={rows} />;
    case 'coverage': return <CoverageReport data={obj} />;
    case 'inactive': return <InactiveReport data={obj} />;
    case 'workload': return <WorkloadReport data={obj} />;
    case 'ageing': return <AgeingReport data={obj} />;
    case 'sql': return <SqlQualityReport data={obj} />;
    case 'sequences': return <SequenceReport rows={rows} />;
  }
}

/** Reports come back as a list or as named lists; each list renders as a table with readable headers. */
function GenericReport({ k }: { k: Exclude<ReportKey, 'targets'> }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['report', k], queryFn: () => api.get<unknown>(ENDPOINT[k]) });
  if (isLoading) return <Card><SkeletonRows /></Card>;
  if (error) return <Card><Empty title="Couldn’t load the report" body={(error as Error).message} /></Card>;
  const sections: [string, Record<string, unknown>[]][] = Array.isArray(data) ? [['', data as Record<string, unknown>[]]] : Object.entries((data ?? {}) as Record<string, Record<string, unknown>[]>);
  return (
    <div className="space-y-4">
      {k === 'l1' && (
        <div className="flex justify-end">
          <Button icon={<Download className="h-3.5 w-3.5" />} onClick={() => api.download(ENDPOINT.l1, { format: 'csv' }, 'l1-not-progressed.csv').catch((e) => toast.error(e.message))}>Export CSV</Button>
        </div>
      )}
      <DedicatedView k={k} data={data} />
      {sections.some(([, rows]) => Array.isArray(rows) && rows.length) && (
        <details className="group rounded-[22px] border border-line/80 bg-white/70 open:bg-transparent open:border-transparent">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[13px] font-semibold group-open:px-1"><span>Detailed data</span><span className="text-xs font-normal text-ink-muted group-open:hidden">Show tables</span></summary>
          <div className="space-y-4">
      {[...sections].filter(([, rows]) => Array.isArray(rows) && rows.length).sort((x, y) => Number(!(Array.isArray(y[1]) && y[1].length)) - Number(!(Array.isArray(x[1]) && x[1].length)) || 0).map(([title, rows]) => {
        const t = title ? humanize(title.replace(/([A-Z])/g, '_$1')) : undefined;
        const list = Array.isArray(rows) ? rows : [];
        if (!list.length) return <div key={title} className="flex items-center justify-between rounded-[18px] border border-dashed border-line bg-white/60 px-5 py-3.5 text-[13px]"><span className="font-semibold">{t ?? 'Details'}</span><span className="text-xs text-ink-muted">Nothing to show right now</span></div>;
        return <ReportTable key={title} title={t} rows={list} />;
      })}
          </div>
        </details>
      )}
    </div>
  );
}

const isNum = (v: unknown) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) && !/^\d{4}-/.test(v));
const pretty = (c: string) => humanize(c.replace(/([A-Z])/g, '_$1'));

function cell(key: string, v: unknown) {
  if (v === null || v === undefined || v === '') return <span className="text-ink-muted">—</span>;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (/mrr/i.test(key)) return inr(v as number);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return fmtDateTime(v);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return fmtDate(v);
  if (typeof v === 'string' && /^[A-Z_]+$/.test(v)) return humanize(v);
  if (typeof v === 'number') return v.toLocaleString('en-IN');
  return String(v);
}

function ReportTable({ title, rows }: { title?: string; rows: Record<string, unknown>[] }) {
  const cols = rows.length ? Object.keys(rows[0]).filter((c) => !/id$/i.test(c) || c === 'id') : [];
  const linkCol = rows.length && ('accountId' in rows[0] || 'id' in rows[0]) ? ('accountId' in rows[0] ? 'accountId' : 'id') : null;
  const visible = cols.filter((c) => c !== 'id');
  const numCols = visible.filter((c) => rows.every((r) => r[c] == null || (typeof r[c] === 'number' || (typeof r[c] === 'string' && isNum(r[c])))) && !/date|at$/i.test(c));
  const max = Object.fromEntries(numCols.map((c) => [c, Math.max(1, ...rows.map((r) => Number(r[c] ?? 0)))]));
  return (
    <Card>
      <CardHeader title={title ?? 'Details'} subtitle={`${rows.length} row${rows.length === 1 ? '' : 's'}`} />
      {rows.length === 0 ? (
        <div className="m-5 rounded-2xl border border-dashed border-line px-4 py-8 text-center"><p className="font-display text-[15px] font-medium">Nothing to show</p><p className="mt-1 text-xs text-ink-muted">Nothing matches this report right now.</p></div>
      ) : (
        <div className="overflow-x-auto p-3">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left">{visible.map((c) => <th key={c} className={cn('whitespace-nowrap px-3', numCols.includes(c) && 'text-right')}>{pretty(c)}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-line/50 last:border-0">
                  {visible.map((c, j) => (
                    <td key={c} className={cn('whitespace-nowrap px-3', numCols.includes(c) && 'text-right')}>
                      {j === 0 && linkCol && r[linkCol]
                        ? <Link to={`/accounts/${r[linkCol]}`} className="flex items-center gap-2.5 font-semibold hover:text-brand-forest"><EntityTile name={String(r[c])} size="sm" />{String(r[c])}</Link>
                        : numCols.includes(c) && !/mrr/i.test(c)
                          ? <span className="inline-flex items-center justify-end gap-2"><span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-black/[0.06] sm:block"><span className="block h-full rounded-full bg-gradient-to-r from-brand-forest to-brand-mint" style={{ width: `${(100 * Number(r[c] ?? 0)) / max[c]}%` }} /></span><span className="w-8 font-semibold tabular-nums">{cell(c, Number(r[c] ?? 0))}</span></span>
                          : cell(c, r[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

const METRICS = ['L1_BOOKED', 'L1_DONE', 'L2_DONE', 'L3_DONE', 'WON', 'MRR', 'SQL_APPROVED'];

function Targets() {
  const users = useUsers();
  const people = users.data?.filter((u) => u.active && (u.role === 'BDR' || u.role === 'AE')) ?? [];
  const [userId, setUserId] = useState('');
  const [metric, setMetric] = useState('L1_BOOKED');
  const [value, setValue] = useState('');
  const monthStart = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 8) + '01';
  const ach = useQuery({ queryKey: ['achievement', userId], queryFn: () => api.get<Achievement[]>('/api/targets/achievement', { userId: userId || undefined, period: 'MONTH' }) });
  const save = useAction(() => api.put('/api/targets', { userId, periodType: 'MONTH', periodDate: monthStart, metric, value: Number(value) }), {
    success: 'Target set', invalidate: [['achievement'], ['dashboard']], onSuccess: () => setValue(''),
  });
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="mb-3 flex items-center gap-2 font-display text-[16px] font-medium tracking-[-0.02em]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-forest text-white"><Target className="h-3.5 w-3.5" /></span>Set a target for this month</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_1fr_140px_auto]">
          <Field label="Person"><Select value={userId} onChange={(e) => setUserId(e.target.value)}><option value="">Select…</option>{people.map((u) => <option key={u.id} value={u.id}>{u.fullName} · {u.role}</option>)}</Select></Field>
          <Field label="Metric"><Select value={metric} onChange={(e) => setMetric(e.target.value)}>{METRICS.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}</Select></Field>
          <Field label={metric === 'MRR' ? 'Target (₹)' : 'Target'}><Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} /></Field>
          <div className="flex items-end"><Button variant="primary" disabled={!userId || !value} loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button></div>
        </div>
      </Card>
      {!!ach.data?.length && (
        <ChartCard title="Achievement at a glance" subtitle="Live, against this month’s targets">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ach.data.slice(0, 8).map((a, i) => (
              <RadialGauge key={i} value={Number(a.pct ?? 0)} size={112} label={a.userName}
                sub={`${humanize(a.metric)} · ${a.metric === 'MRR' ? `${inr(a.actual)} / ${inr(a.target)}` : `${Number(a.actual)} / ${Number(a.target)}`}`} />
            ))}
          </div>
        </ChartCard>
      )}
      <Card>
        <CardHeader title="Achievement this month" subtitle={userId ? people.find((p) => p.id === userId)?.fullName : 'Whole team'} />
        <div className="p-2">
          {!ach.data?.length ? <p className="px-2 py-6 text-center text-xs text-ink-muted">No targets set for this month yet.</p> : (
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-2xs uppercase tracking-wide text-ink-muted"><th className="px-2 py-2 font-medium">Person</th><th className="px-2 font-medium">Metric</th><th className="px-2 text-right font-medium">Actual / Target</th><th className="w-1/3 px-2 font-medium">Progress</th></tr></thead>
              <tbody>
                {ach.data.map((a, i) => {
                  const pct = Math.min(100, Math.round(a.pct ?? 0));
                  return (
                    <tr key={i} className="border-t border-line/70">
                      <td className="px-2 py-2 font-medium">{a.userName}</td><td className="px-2">{humanize(a.metric)}</td>
                      <td className="px-2 text-right tabular-nums">{a.metric === 'MRR' ? `${inr(a.actual)} / ${inr(a.target)}` : `${Number(a.actual)} / ${Number(a.target)}`}</td>
                      <td className="px-2"><div className="flex items-center gap-2"><div className="flex-1"><Meter value={pct} max={100} /></div><span className="w-9 text-right text-xs tabular-nums text-ink-muted">{pct}%</span></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
