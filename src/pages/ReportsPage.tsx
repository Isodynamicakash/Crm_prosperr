import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Target } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useUsers } from '@/lib/queries';
import { cn } from '@/lib/cn';
import { fmtDate, fmtDateTime, humanize, inr } from '@/lib/format';
import type { Achievement } from '@/lib/types';
import { Button, Card, CardHeader, Empty, Field, Input, PageHeader, Select, SkeletonRows } from '@/components/ui/ui';

type ReportKey = 'targets' | 'l1' | 'coverage' | 'inactive' | 'workload' | 'ageing' | 'sql' | 'sequences';
const REPORTS: { key: ReportKey; label: string; hint: string }[] = [
  { key: 'targets', label: 'Targets', hint: 'Set monthly targets and track achievement live.' },
  { key: 'l1', label: 'L1 done, not in L2', hint: 'Accounts that had an L1 but haven’t progressed.' },
  { key: 'coverage', label: 'Stakeholder coverage', hint: 'Junior-only accounts and missing senior Finance/HR.' },
  { key: 'inactive', label: 'Inactive reasons', hint: 'Why accounts go inactive, by reason and owner.' },
  { key: 'workload', label: 'Workload', hint: 'Calls, meetings and tasks per person.' },
  { key: 'ageing', label: 'Ageing', hint: 'How long accounts sit in each stage.' },
  { key: 'sql', label: 'SQL quality', hint: 'Approval and rejection patterns per BDR.' },
  { key: 'sequences', label: 'Email sequences', hint: 'Sends, replies and bounces per sequence.' },
];

export default function ReportsPage() {
  const [key, setKey] = useState<ReportKey>('targets');
  const r = REPORTS.find((x) => x.key === key)!;
  return (
    <div>
      <PageHeader title="Reports" subtitle="Every number links back to the accounts behind it." />
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-0.5">
          {REPORTS.map((x) => (
            <button key={x.key} onClick={() => setKey(x.key)}
              className={cn('w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink-soft transition-colors hover:bg-black/[0.04]', key === x.key && 'bg-white text-ink shadow-card ring-1 ring-line')}>
              {x.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          <p className="mb-3 text-[13px] text-ink-muted">{r.hint}</p>
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
      {sections.map(([title, rows]) => <ReportTable key={title} title={title ? humanize(title.replace(/([A-Z])/g, '_$1')) : undefined} rows={Array.isArray(rows) ? rows : []} />)}
    </div>
  );
}

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
  return (
    <Card>
      {title && <CardHeader title={title} subtitle={`${rows.length} row${rows.length === 1 ? '' : 's'}`} />}
      {rows.length === 0 ? <p className="px-4 py-6 text-center text-xs text-ink-muted">Nothing to show.</p> : (
        <div className="overflow-x-auto p-2">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-2xs uppercase tracking-wide text-ink-muted">{visible.map((c) => <th key={c} className="whitespace-nowrap px-2 py-2 font-medium">{humanize(c.replace(/([A-Z])/g, '_$1'))}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-line/70 hover:bg-canvas">
                  {visible.map((c, j) => (
                    <td key={c} className="whitespace-nowrap px-2 py-2">
                      {j === 0 && linkCol && r[linkCol] && /name/i.test(c) ? <Link to={`/accounts/${r[linkCol]}`} className="font-medium hover:text-accent">{String(r[c])}</Link> : cell(c, r[c])}
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
        <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold"><Target className="h-4 w-4 text-accent" />Set a target for this month</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_1fr_140px_auto]">
          <Field label="Person"><Select value={userId} onChange={(e) => setUserId(e.target.value)}><option value="">Select…</option>{people.map((u) => <option key={u.id} value={u.id}>{u.fullName} · {u.role}</option>)}</Select></Field>
          <Field label="Metric"><Select value={metric} onChange={(e) => setMetric(e.target.value)}>{METRICS.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}</Select></Field>
          <Field label={metric === 'MRR' ? 'Target (₹)' : 'Target'}><Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} /></Field>
          <div className="flex items-end"><Button variant="primary" disabled={!userId || !value} loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button></div>
        </div>
      </Card>
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
                      <td className="px-2"><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-canvas"><div className={cn('h-2 rounded-full', pct >= 100 ? 'bg-success' : pct >= 60 ? 'bg-accent' : 'bg-warning')} style={{ width: `${pct}%` }} /></div><span className="w-9 text-right text-xs tabular-nums text-ink-muted">{pct}%</span></div></td>
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
