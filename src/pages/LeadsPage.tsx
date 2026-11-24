import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Search, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useUsers } from '@/lib/queries';
import { fmtDate, relTime } from '@/lib/format';
import { EngagementBadge, stageLabel } from '@/components/ui/status';
import { AreaTrend, C, ChartCard, Donut, EmptyChart, GroupedBars, Meter } from '@/components/charts/kit';
import { PeriodPicker, periodLabel, periodParams, type Preset } from '@/features/dashboard/pulse';
import { Button, Card, Checkbox, Empty, Input, PageHeader, Select, SkeletonRows } from '@/components/ui/ui';
import type { EngagementStatus, LifecycleStage } from '@/lib/types';

interface Count { label?: string; status?: string; stage?: string; count: number }
interface Leads {
  name: string;
  totals: { accounts: number; prospecting: number; inPipeline: number; won: number; contacts: number; neverCalled: number; stale: number; overdue: number };
  contactFunnel: Count[]; accountStages: Count[]; bySource: Count[]; byCityTier: Count[]; bySize: Count[]; byLevel: Count[]; byFunction: Count[];
  weekly: { week: string; calls: number; connects: number; l1Booked: number }[];
  attention: { id: string; name: string; stage: LifecycleStage; intent?: string; city?: string; lastTouch: string; contacts: number; reason: string }[];
  period: {
    from: string; to: string; bucket: 'day' | 'week' | 'month';
    kpis: { newContacts: number; calls: number; connects: number; companiesTouched: number; emailsSent: number; sqlsSubmitted: number; sqlsApproved: number;
      l1Booked?: number; l1Done?: number; l2Done?: number; l3Done?: number; l1BookedTarget?: number | null; l1DoneTarget?: number | null; l3DoneTarget?: number | null };
    trend: { start: string; calls: number; connects: number; l1Booked: number; l1Done: number }[];
    outcomes: { outcome: string; count: number; connect: boolean }[];
  };
}
interface LeadRow { id: string; name: string; designation?: string; level?: number; department?: string; status: EngagementStatus; callAttempts: number;
  doNotContact: boolean; accountId: string; company: string; stage: LifecycleStage; city?: string; lastTouch?: string; nextFollowUp?: string }

const n = (rows: Count[], ...keys: string[]) => rows.filter((r) => keys.includes(r.status ?? r.stage ?? r.label ?? '')).reduce((a, r) => a + Number(r.count), 0);
const PALETTE = [C.forest, C.mint, C.navy, C.sage, C.slate, C.forest2, C.pale];
const SIZE: Record<string, string> = { SMALL: 'Small', MEDIUM: 'Medium', LARGE: 'Large', ENTERPRISE: 'Enterprise', UNKNOWN: 'Not set' };
const TIER: Record<string, string> = { 'Other cities': 'Other' };
const FN: Record<string, string> = { HR: 'HR', FINANCE: 'Finance', PAYROLL: 'Payroll', OTHER: 'Other' };

/** One BDR's own book: where every lead stands, where they came from, the last 12 weeks, and what needs attention. */
export default function LeadsPage() {
  const { user } = useAuth();
  const leader = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const users = useUsers(leader);
  const bdrs = (users.data ?? []).filter((u) => u.role === 'BDR' && u.active);
  const [picked, setPicked] = useState<string>('');
  const [preset, setPreset] = useState<Preset>('month');
  const bdrId = leader ? picked || bdrs[0]?.id : undefined;
  const q = useQuery({ queryKey: ['my-leads', bdrId ?? 'me', preset], enabled: !leader || !!bdrId, placeholderData: (prev) => prev,
    queryFn: () => api.get<Leads>('/api/dashboards/bdr/leads', { ...(bdrId ? { bdrId } : {}), ...periodParams(preset) }) });
  const d = q.data;

  const funnel = d ? (() => {
    const f = d.contactFunnel;
    const all = f.reduce((a, r) => a + Number(r.count), 0);
    const steps = [
      { label: 'All contacts', count: all },
      { label: 'Reached out', count: all - n(f, 'NOT_CONTACTED') },
      { label: 'Had a conversation', count: n(f, 'CONNECTED', 'FOLLOW_UP_PENDING', 'REFERRED', 'MEETING_SCHEDULED', 'MEETING_COMPLETED') },
      { label: 'Meeting booked', count: n(f, 'MEETING_SCHEDULED', 'MEETING_COMPLETED') },
      { label: 'Meeting held', count: n(f, 'MEETING_COMPLETED') },
    ];
    return { steps, all, dropped: n(f, 'NOT_RELEVANT', 'UNRESPONSIVE') };
  })() : null;
  const stageOrder: LifecycleStage[] = ['PROSPECT', 'SQL', 'L1', 'MULTITHREADING', 'L2', 'L3', 'NEGOTIATION', 'WON', 'LOST'];
  const stages = d ? stageOrder.map((s) => ({ stage: stageLabel[s] ?? s, companies: n(d.accountStages, s) })).filter((x) => x.companies > 0) : [];
  const donut = (rows: Count[], names?: Record<string, string>) => rows.map((r, i) => ({ name: names?.[r.label!] ?? r.label!, value: Number(r.count), color: PALETTE[i % PALETTE.length] }));

  return (
    <div className="space-y-4">
      <PageHeader title={leader && d ? `${d.name}'s leads` : 'My leads'} icon={<Target />} eyebrow={leader ? 'One BDR at a time' : 'Your book'}
        subtitle={leader ? "Only this BDR's own companies and contacts: what they did in the period, where each lead stands, and what needs attention."
          : 'Only your own companies and contacts: what you did in the period, where each lead stands, and what needs you next.'}
        actions={<div className="flex flex-wrap items-center gap-2">
          {leader && (
            <Select id="leads-bdr" value={bdrId ?? ''} onChange={(e) => setPicked(e.target.value)} className="w-48" aria-label="BDR">
              {bdrs.map((b) => <option key={b.id} value={b.id}>{b.fullName}</option>)}
            </Select>
          )}
          <PeriodPicker preset={preset} onPreset={setPreset} />
        </div>}
        stats={d ? [
          { label: 'Companies', value: d.totals.accounts, hint: `${d.totals.prospecting} prospecting · ${d.totals.inPipeline} in pipeline` },
          { label: 'Contacts', value: d.totals.contacts, hint: `${d.totals.neverCalled} never called` },
          { label: 'Quiet 30+ days', value: d.totals.stale, hint: 'Prospecting companies with no touch' },
          { label: 'Overdue follow-ups', value: d.totals.overdue, hint: d.totals.overdue ? 'Clear these first' : 'All caught up' },
        ] : undefined} />

      {q.isLoading || !d ? <SkeletonRows rows={8} /> : (
        <>
          <PeriodSection p={d.period} label={periodLabel(preset)} />
          <h2 className="pt-2 font-display text-[17px] font-medium">Where your leads stand right now</h2>
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Your contacts, step by step" subtitle={`From first call to meeting held${funnel!.dropped ? ` · ${funnel!.dropped} marked not relevant or unresponsive` : ''}`}>
              {funnel!.all === 0 ? <EmptyChart>No contacts yet.</EmptyChart> : (
                <ul className="space-y-2 pt-1">
                  {funnel!.steps.map((s, i) => {
                    const pct = funnel!.all ? Math.round((100 * s.count) / funnel!.all) : 0;
                    return (
                      <li key={s.label} className="flex items-center gap-3">
                        <span className="w-36 shrink-0 text-[12.5px] font-medium text-ink-soft">{s.label}</span>
                        <div className="h-8 flex-1 overflow-hidden rounded-[10px] bg-canvas">
                          <div className="flex h-full items-center rounded-[10px] px-2.5 text-[12px] font-semibold text-white transition-[width] duration-700"
                            style={{ width: `${Math.max(8, pct)}%`, background: `linear-gradient(90deg, ${C.forest}, ${i > 2 ? C.mint : C.forest2})` }}>{s.count}</div>
                        </div>
                        <span className="w-10 text-right text-[11px] font-semibold tabular-nums text-brand-forest">{i === 0 ? '' : `${pct}%`}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ChartCard>
            <ChartCard title="Your companies by stage" subtitle="Prospects you work, and deals your SQLs became">
              {!stages.length ? <EmptyChart>No companies yet.</EmptyChart> : <GroupedBars horizontal data={stages} x="stage" series={[{ key: 'companies', name: 'Companies', color: C.forest }]} height={250} />}
            </ChartCard>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ChartCard title="Where they came from" subtitle="Lead source of your companies"><Donut data={donut(d.bySource)} height={210} center={d.totals.accounts} sub="companies" /></ChartCard>
            <ChartCard title="ICP city fit" subtitle="P0 cities pass the SQL check; P1 needs high intent"><Donut data={donut(d.byCityTier, TIER)} height={210} center={n(d.byCityTier, 'P0')} sub="in P0 cities" /></ChartCard>
            <ChartCard title="Company size" subtitle="Licences: small ≤250 · medium ≤500 · large ≤1,000 · SQL needs 251+"><Donut data={donut(d.bySize, SIZE)} height={210} /></ChartCard>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Seniority of your contacts" subtitle="L1 = CXO, VP, heads · L2 = directors · an SQL needs L1 or L2">
              <GroupedBars data={d.byLevel.map((r) => ({ level: r.label!, contacts: Number(r.count) }))} x="level" series={[{ key: 'contacts', name: 'Contacts', color: C.forest }]} height={220} />
            </ChartCard>
            <ChartCard title="Functions covered" subtitle="Prosperr sells to Finance, HR and Payroll">
              <GroupedBars horizontal data={d.byFunction.map((r) => ({ fn: FN[r.label!] ?? r.label!, contacts: Number(r.count) }))} x="fn" series={[{ key: 'contacts', name: 'Contacts', color: C.mint }]} height={200} />
            </ChartCard>
          </div>

          <ChartCard title="Needs your attention" subtitle="Your quiet companies that matter most: high intent first, then best ICP fit"
            action={<Link to="/accounts" className="flex items-center gap-1 text-xs font-semibold text-brand-forest hover:underline">All my accounts<ArrowRight className="h-3 w-3" /></Link>}>
            {d.attention.length === 0 ? <Empty icon={<AlertTriangle className="h-5 w-5" />} title="Nothing has gone quiet" body="Every company you work had a touch in the last 30 days." /> : (
              <ul className="divide-y divide-line/70">
                {d.attention.map((a) => (
                  <li key={a.id}><Link to={`/accounts/${a.id}`} className="flex flex-wrap items-center gap-3 py-2.5 hover:text-brand-forest">
                    <span className="min-w-0 flex-1"><b className="text-[14px] font-semibold">{a.name}</b>
                      <span className="block text-xs text-ink-muted">{[a.reason, a.city, `${a.contacts} contact${a.contacts === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</span></span>
                    <span className="text-xs text-ink-muted">last touch: {touch(a.lastTouch)}</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </ChartCard>
          <LeadTable bdrId={bdrId} preset={preset} />
        </>
      )}
    </div>
  );
}

/** "This month" / "30 days" read lower-case mid-sentence; month names and dates keep their capitals. */
const inText = (label: string) => (/^(this|last|\d|quarter)/i.test(label) ? label.toLowerCase() : label);
/** Undated rows from the sheets were given 1 Jan 2026: say so instead of showing a made-up date. */
const touch = (iso?: string) => (!iso ? 'Never' : iso.startsWith('2026-01-01') ? 'No date in sheet' : relTime(iso));

const BUCKET_LABEL = { day: 'day by day', week: 'week by week', month: 'month by month' } as const;
const tick = (iso: string, b: 'day' | 'week' | 'month') => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', b === 'month' ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' });

function Tile({ label, value, hint, target }: { label: string; value: number | string; hint?: string; target?: number | null }) {
  const t = target != null && target > 0 ? Math.round(target) : null;
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-[26px] font-medium tabular-nums">{value}{t != null && <span className="text-[15px] text-ink-muted"> / {t}</span>}</p>
      {t != null && <div className="mt-1.5"><Meter value={Number(value)} max={t} /></div>}
      {hint && <p className="mt-1 text-[11.5px] text-ink-muted">{hint}</p>}
    </Card>
  );
}

/** What the BDR did in the chosen period, against target. */
function PeriodSection({ p, label }: { p: Leads['period']; label: string }) {
  const k = p.kpis;
  const rate = k.calls ? Math.round((100 * k.connects) / k.calls) : null;
  return (
    <div className="space-y-4">
      <h2 className="font-display text-[17px] font-medium">What you did · {label} <span className="text-[13px] text-ink-muted">· {fmtDate(p.from)} – {fmtDate(p.to)}</span></h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="L1 booked" value={k.l1Booked ?? 0} target={k.l1BookedTarget} hint={k.l1BookedTarget ? 'against target' : 'no target set'} />
        <Tile label="L1 done" value={k.l1Done ?? 0} target={k.l1DoneTarget} hint={`${k.l2Done ?? 0} L2 · ${k.l3Done ?? 0} L3 done`} />
        <Tile label="Calls" value={k.calls} hint={rate == null ? 'none logged' : `${k.connects} conversations · ${rate}% connect`} />
        <Tile label="SQLs submitted" value={k.sqlsSubmitted} hint={`${k.sqlsApproved} approved · ${k.companiesTouched} companies touched`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Activity over the period" subtitle={`Calls, conversations and L1 meetings, ${BUCKET_LABEL[p.bucket]}`}>
          {p.trend.every((t) => !t.calls && !t.l1Booked && !t.l1Done) ? <EmptyChart>Nothing logged in this period.</EmptyChart> : (
            <AreaTrend data={p.trend.map((t) => ({ ...t, label: tick(t.start, p.bucket) }))} x="label"
              series={[{ key: 'calls', name: 'Calls', color: C.forest }, { key: 'connects', name: 'Conversations', color: C.mint }]}
              bars={[{ key: 'l1Booked', name: 'L1 booked', color: C.navy }, { key: 'l1Done', name: 'L1 done', color: C.sage }]} height={250} />
          )}
        </ChartCard>
        <ChartCard title="Call outcomes" subtitle={k.calls ? `${k.calls} calls in the period` : 'What happened on each call'}>
          {!p.outcomes.length ? <EmptyChart>No calls logged in this period.</EmptyChart> : (
            <Donut height={210} center={rate == null ? '—' : `${rate}%`} sub="connect rate"
              data={p.outcomes.slice(0, 7).map((o, i) => ({ name: o.outcome, value: Number(o.count), color: o.connect ? [C.forest, C.mint, C.sage, C.forest2, C.pale][i % 5] : [C.slate, '#CBD5E1', C.navy][i % 3] }))} />
          )}
        </ChartCard>
      </div>
      {k.newContacts > 0 && <p className="text-xs text-ink-muted">{k.newContacts} contact{k.newContacts === 1 ? '' : 's'} added to the CRM in this period (the one-time load from the team's sheets counts as added on 23 Nov 2026).</p>}
    </div>
  );
}

const STATUSES: [EngagementStatus | '', string][] = [['', 'Any status'], ['NOT_CONTACTED', 'Not contacted'], ['CONTACTED', 'Contacted'], ['CONNECTED', 'Connected'],
  ['FOLLOW_UP_PENDING', 'Follow-up pending'], ['REFERRED', 'Referred'], ['MEETING_SCHEDULED', 'Meeting scheduled'], ['MEETING_COMPLETED', 'Meeting completed'],
  ['UNRESPONSIVE', 'Unresponsive'], ['NOT_RELEVANT', 'Not relevant']];

/** Every contact the BDR owns, searchable; optionally only the people worked in the chosen period. */
function LeadTable({ bdrId, preset }: { bdrId?: string; preset: Preset }) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('');
  const [level, setLevel] = useState('');
  const [sort, setSort] = useState('recent');
  const [touched, setTouched] = useState(false);
  const [page, setPage] = useState(0);
  useEffect(() => { const t = setTimeout(() => setTerm(search), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(0); }, [term, status, level, sort, touched, bdrId, preset]);
  const q = useQuery({ queryKey: ['my-leads-list', bdrId ?? 'me', term, status, level, sort, touched, touched ? preset : '', page], placeholderData: (prev) => prev,
    queryFn: () => api.get<{ total: number; items: LeadRow[] }>('/api/dashboards/bdr/leads/list', {
      ...(bdrId ? { bdrId } : {}), q: term || undefined, status: status || undefined, level: level || undefined, sort, page, size: 25,
      ...(touched ? { touched: true, ...periodParams(preset) } : {}) }) });
  const total = q.data?.total ?? 0;
  return (
    <ChartCard title="Your leads" subtitle={`${total} contact${total === 1 ? '' : 's'}${touched ? ` worked in ${inText(periodLabel(preset))}` : ''} · only people you own`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
          <Input id="lead-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, company or title" className="pl-9" /></div>
        <Select id="lead-status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-44" aria-label="Status">{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Select id="lead-level" value={level} onChange={(e) => setLevel(e.target.value)} className="w-32" aria-label="Level">
          <option value="">Any level</option>{[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>L{l}</option>)}</Select>
        <Select id="lead-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="w-44" aria-label="Sort">
          <option value="recent">Recently touched</option><option value="senior">Most senior first</option><option value="followUp">Next follow-up</option><option value="company">Company A–Z</option></Select>
        <Checkbox checked={touched} onChange={setTouched} label={<span className="text-[13px]">Only worked in this period</span>} />
      </div>
      {q.isLoading ? <SkeletonRows rows={5} /> : !q.data?.items.length ? <Empty icon={<Target className="h-5 w-5" />} title="No leads match" body="Change the filters or the period." /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-ink-muted"><tr className="border-b border-line">
              <th className="py-2 pr-3 font-semibold">Person</th><th className="py-2 pr-3 font-semibold">Company</th><th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 pr-3 font-semibold">Last touch</th><th className="py-2 font-semibold">Next follow-up</th></tr></thead>
            <tbody>{q.data.items.map((r) => (
              <tr key={r.id} className="border-b border-line/60 hover:bg-canvas/60">
                <td className="py-2 pr-3"><Link to={`/accounts/${r.accountId}?stakeholder=${r.id}`} className="font-semibold hover:text-brand-forest">{r.name}</Link>
                  <span className="block text-xs text-ink-muted">{[r.designation, r.level ? `L${r.level}` : null, r.department && FN[r.department]].filter(Boolean).join(' · ')}</span></td>
                <td className="py-2 pr-3"><Link to={`/accounts/${r.accountId}`} className="hover:text-brand-forest">{r.company}</Link>
                  <span className="block text-xs text-ink-muted">{[stageLabel[r.stage], r.city].filter(Boolean).join(' · ')}</span></td>
                <td className="py-2 pr-3"><EngagementBadge status={r.status} />{r.doNotContact && <span className="ml-1 text-xs text-ink-muted">· do not contact</span>}</td>
                <td className="py-2 pr-3 text-ink-muted">{touch(r.lastTouch)}</td>
                <td className="py-2 text-ink-muted">{r.nextFollowUp ? fmtDate(r.nextFollowUp) : '—'}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      {total > 25 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-ink-muted">
          {page * 25 + 1}–{Math.min(total, (page + 1) * 25)} of {total}
          <Button size="sm" variant="ghost" icon={<ChevronLeft className="h-3.5 w-3.5" />} disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page" />
          <Button size="sm" variant="ghost" icon={<ChevronRight className="h-3.5 w-3.5" />} disabled={(page + 1) * 25 >= total} onClick={() => setPage(page + 1)} aria-label="Next page" />
        </div>
      )}
    </ChartCard>
  );
}
