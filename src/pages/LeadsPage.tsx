import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useUsers } from '@/lib/queries';
import { relTime } from '@/lib/format';
import { stageLabel } from '@/components/ui/status';
import { AreaTrend, C, ChartCard, Donut, EmptyChart, GroupedBars } from '@/components/charts/kit';
import { Empty, PageHeader, Select, SkeletonRows } from '@/components/ui/ui';
import type { LifecycleStage } from '@/lib/types';

interface Count { label?: string; status?: string; stage?: string; count: number }
interface Leads {
  name: string;
  totals: { accounts: number; prospecting: number; inPipeline: number; won: number; contacts: number; neverCalled: number; stale: number; overdue: number };
  contactFunnel: Count[]; accountStages: Count[]; bySource: Count[]; byCityTier: Count[]; bySize: Count[]; byLevel: Count[]; byFunction: Count[];
  weekly: { week: string; calls: number; connects: number; l1Booked: number }[];
  attention: { id: string; name: string; stage: LifecycleStage; intent?: string; city?: string; lastTouch: string; contacts: number; reason: string }[];
}

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
  const bdrId = leader ? picked || bdrs[0]?.id : undefined;
  const q = useQuery({ queryKey: ['my-leads', bdrId ?? 'me'], enabled: !leader || !!bdrId,
    queryFn: () => api.get<Leads>('/api/dashboards/bdr/leads', bdrId ? { bdrId } : undefined) });
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
      <PageHeader title={leader && d ? `${d.name}'s leads` : 'My leads'} icon={<Target />} eyebrow="Your book"
        subtitle="Only your own companies and contacts: where each one stands, where they came from, and what needs you next."
        actions={leader && (
          <Select id="leads-bdr" value={bdrId ?? ''} onChange={(e) => setPicked(e.target.value)} className="w-48" aria-label="BDR">
            {bdrs.map((b) => <option key={b.id} value={b.id}>{b.fullName}</option>)}
          </Select>
        )}
        stats={d ? [
          { label: 'Companies', value: d.totals.accounts, hint: `${d.totals.prospecting} prospecting · ${d.totals.inPipeline} in pipeline` },
          { label: 'Contacts', value: d.totals.contacts, hint: `${d.totals.neverCalled} never called` },
          { label: 'Quiet 30+ days', value: d.totals.stale, hint: 'Prospecting companies with no touch' },
          { label: 'Overdue follow-ups', value: d.totals.overdue, hint: d.totals.overdue ? 'Clear these first' : 'All caught up' },
        ] : undefined} />

      {q.isLoading || !d ? <SkeletonRows rows={8} /> : (
        <>
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

          <ChartCard title="Last 12 weeks" subtitle="Calls you logged, conversations, and L1 meetings booked, week by week">
            {d.weekly.every((w) => !w.calls && !w.l1Booked) ? <EmptyChart>No calls or L1s in the last 12 weeks.</EmptyChart> : (
              <AreaTrend data={d.weekly.map((w) => ({ ...w, label: new Date(`${w.week}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }))} x="label"
                series={[{ key: 'calls', name: 'Calls', color: C.forest }, { key: 'connects', name: 'Conversations', color: C.mint }]}
                bars={[{ key: 'l1Booked', name: 'L1 booked', color: C.navy }]} height={240} />
            )}
          </ChartCard>

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
                    <span className="text-xs text-ink-muted">last touch {relTime(a.lastTouch)}</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}
