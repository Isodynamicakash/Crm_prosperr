import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CalendarClock, CheckCircle2, ClipboardCheck, Hourglass, Inbox, MapPin, ShieldAlert, UserPlus, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { isLeadership, useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { fmtDateTime, humanize, relTime } from '@/lib/format';
import type { QueueRow, SqlRow, SqlStatus } from '@/lib/types';
import { Avatar, Button, Empty, EntityTile, PageHeader, SkeletonRows, Tabs } from '@/components/ui/ui';
import { C, ChartCard, Donut, RadialGauge } from '@/components/charts/kit';
import { AssignModal, ValidateSqlModal } from '@/features/sql/SqlForms';

const OPEN: SqlStatus[] = ['PENDING_QUALIFICATION', 'PENDING_SENIOR_CONNECTION', 'MEETING_BOOKED', 'NO_SHOW'];

/** One look per status: colour, icon, and where it sits on the Submitted → Reviewed → Assigned track. */
const STATUS: Record<SqlStatus, { label: string; color: string; icon: typeof CheckCircle2; step: number }> = {
  PENDING_QUALIFICATION: { label: 'Awaiting review', color: C.mint, icon: Hourglass, step: 1 },
  PENDING_SENIOR_CONNECTION: { label: 'Needs senior contact', color: C.sage, icon: ShieldAlert, step: 1 },
  MEETING_BOOKED: { label: 'Meeting booked', color: C.forest2, icon: CalendarClock, step: 1 },
  NO_SHOW: { label: 'No-show', color: C.slate, icon: CalendarClock, step: 1 },
  QUALIFIED_SQL: { label: 'Qualified', color: C.forest, icon: CheckCircle2, step: 2 },
  REJECTED_NOT_ICP: { label: 'Rejected · not ICP', color: C.navy, icon: XCircle, step: 2 },
  DISQUALIFIED: { label: 'Disqualified', color: C.navy, icon: XCircle, step: 2 },
};

function StatusPill({ status, dark }: { status: SqlStatus; dark?: boolean }) {
  const s = STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold', dark ? 'bg-white/10 text-paper' : 'bg-brand-forest-50 text-brand-forest')}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />{s.label}
    </span>
  );
}

/** Three dots: submitted → reviewed → with an AE. */
function Track({ status, assigned }: { status: SqlStatus; assigned?: boolean }) {
  const at = assigned ? 3 : STATUS[status].step;
  const bad = status === 'REJECTED_NOT_ICP' || status === 'DISQUALIFIED';
  return (
    <div className="flex items-center gap-1.5">
      {['Submitted', 'Reviewed', 'With AE'].map((l, i) => (
        <div key={l} className="flex flex-1 flex-col gap-1">
          <span className={cn('h-1.5 rounded-full', i < at ? (bad && i === 1 ? 'bg-brand-navy' : 'bg-brand-forest') : 'bg-line')} />
          <span className={cn('text-[10px] font-semibold uppercase tracking-[0.08em]', i < at ? 'text-brand-forest' : 'text-ink-muted/70')}>{l}</span>
        </div>
      ))}
    </div>
  );
}

function Chip({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'navy' }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold', tone === 'navy' ? 'bg-brand-navy/10 text-brand-navy' : 'bg-brand-forest-50 text-brand-forest')}>{children}</span>;
}

export default function SqlPage() {
  const { user } = useAuth();
  return isLeadership(user?.role) ? <ManagerQueue /> : <MySqls />;
}

/** Manager (M5-1, M5-3): every SQL waits here to be validated and handed to an AE — nothing is auto-assigned. */
function ManagerQueue() {
  const [tab, setTab] = useState<'queue' | 'all'>('queue');
  const queue = useQuery({ queryKey: ['queue'], queryFn: () => api.get<QueueRow[]>('/api/assignment/queue'), refetchInterval: 30_000 });
  const all = useQuery({ queryKey: ['sql', 'all'], queryFn: () => api.get<SqlRow[]>('/api/sql') });
  const [review, setReview] = useState<string | null>(null);
  const [assign, setAssign] = useState<{ id: string; name: string } | null>(null);
  const rows = queue.data ?? [];
  const toReview = rows.filter((r) => OPEN.includes(r.status));
  const toAssign = rows.filter((r) => r.status === 'QUALIFIED_SQL');

  const QueueCard = ({ r }: { r: QueueRow }) => {
    const assignNow = r.status === 'QUALIFIED_SQL';
    return (
      <div className="group relative flex flex-col overflow-hidden rounded-[22px] border border-line/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-forest/25 hover:shadow-[0_20px_40px_-26px_rgba(5,63,26,.65)]">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-forest to-brand-mint opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="flex items-start gap-3">
          <EntityTile name={r.accountName} />
          <div className="min-w-0 flex-1">
            <Link to={`/accounts/${r.accountId}`} className="flex items-center gap-1 font-semibold leading-tight hover:text-brand-forest"><span className="truncate">{r.accountName}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" /></Link>
            <p className="mt-0.5 text-[11.5px] text-brand-forest/70">Submitted {relTime(r.submittedAt)}</p>
          </div>
          <StatusPill status={r.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.sizeBucket && <Chip>{humanize(r.sizeBucket)}</Chip>}
          {r.locationPriority && <Chip tone={r.locationPriority === 'P1' ? 'navy' : 'green'}><MapPin className="h-3 w-3" />{r.locationPriority} city</Chip>}
          {r.smallException && <Chip tone="navy">Small exception</Chip>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-canvas/80 p-3 text-[12px]">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">BDR</p><p className="mt-1 flex items-center gap-1.5 font-semibold"><Avatar name={r.submittedBy} size="xs" /><span className="truncate">{r.submittedBy}</span></p></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">L1 meeting</p><p className="mt-1 truncate font-semibold">{r.l1At ? fmtDateTime(r.l1At) : 'Not booked'}</p></div>
        </div>
        <div className="mt-3"><Track status={r.status} /></div>
        <div className="mt-4 flex-1" />
        {assignNow
          ? <Button variant="primary" className="w-full justify-center" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setAssign({ id: r.accountId, name: r.accountName })}>Assign an AE</Button>
          : <Button variant="primary" className="w-full justify-center" icon={<ClipboardCheck className="h-3.5 w-3.5" />} onClick={() => setReview(r.submissionId)}>Review SQL</Button>}
      </div>
    );
  };

  const Lane = ({ title, hint, list, icon: Icon }: { title: string; hint: string; list: QueueRow[]; icon: typeof Inbox }) => (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-forest text-white"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><p className="font-display text-[18px] font-medium leading-tight tracking-[-0.02em]">{title}</p><p className="text-[12px] text-brand-forest/70">{hint}</p></div>
        <span className="rounded-full bg-brand-forest px-2.5 py-0.5 font-display text-[13px] text-white tabular-nums">{list.length}</span>
      </div>
      {list.length === 0
        ? <div className="rounded-[22px] border border-dashed border-brand-forest/20 bg-brand-forest-50/40 px-5 py-6 text-center text-[13px] font-medium text-brand-forest/70">Nothing here — nice.</div>
        : <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{list.map((r) => <QueueCard key={r.submissionId} r={r} />)}</div>}
    </section>
  );

  return (
    <div>
      <PageHeader title="SQL queue" icon={<ClipboardCheck />} eyebrow="Qualification" subtitle="Every SQL is validated here and handed to an AE — nothing is auto-assigned."
        stats={[
          { label: 'To review', value: toReview.length, hint: 'Waiting on you', onClick: () => setTab('queue') },
          { label: 'Waiting for an AE', value: toAssign.length, hint: 'Approved, not assigned', onClick: () => setTab('queue') },
          { label: 'Small exceptions', value: rows.filter((r) => r.smallException).length, hint: 'Need your approval' },
          { label: 'P1 cities', value: rows.filter((r) => r.locationPriority === 'P1').length, hint: 'Confirm intent' },
        ]} />
      <div className="mb-4 flex"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'queue', label: 'Needs action', count: rows.length }, { value: 'all', label: 'All SQLs', count: all.data?.length }]} /></div>
      {tab === 'queue' ? (
        queue.isLoading ? <SkeletonRows /> : rows.length === 0 ? (
          <div className="rounded-[24px] border border-line/80 bg-white"><Empty icon={<Inbox className="h-5 w-5" />} title="Queue is clear" body="New SQLs from BDRs show up here for review." /></div>
        ) : (
          <div className="space-y-6">
            <Lane title="Review" hint="Validate the qualification" list={toReview} icon={ClipboardCheck} />
            <Lane title="Assign an AE" hint="Approved and ready to hand over" list={toAssign} icon={UserPlus} />
          </div>
        )
      ) : <SqlBoard rows={all.data} loading={all.isLoading} showBdr />}
      <ValidateSqlModal open={!!review} submissionId={review} onClose={() => setReview(null)} onApproved={(id, name) => setAssign({ id, name })} />
      <AssignModal open={!!assign} accountId={assign?.id ?? null} accountName={assign?.name} onClose={() => setAssign(null)} />
    </div>
  );
}

/** BDR view: every SQL they submitted and where it stands. */
function MySqls() {
  const { data, isLoading } = useQuery({ queryKey: ['sql', 'mine'], queryFn: () => api.get<SqlRow[]>('/api/sql'), refetchInterval: 30_000 });
  const approved = data?.filter((s) => s.status === 'QUALIFIED_SQL').length ?? 0;
  return (
    <div>
      <PageHeader title="My SQLs" icon={<ClipboardCheck />} eyebrow="Qualification" subtitle="Every SQL you submitted and where it stands."
        stats={[
          { label: 'Submitted', value: data?.length ?? 0 },
          { label: 'Approved', value: approved, hint: data?.length ? `${Math.round((100 * approved) / data.length)}% approval` : undefined },
          { label: 'In progress', value: data?.filter((x) => OPEN.includes(x.status)).length ?? 0 },
          { label: 'Rejected', value: data?.filter((x) => x.status === 'REJECTED_NOT_ICP' || x.status === 'DISQUALIFIED').length ?? 0 },
        ]} />
      <SqlBoard rows={data} loading={isLoading} />
    </div>
  );
}

/** Charts on top, then every SQL as a card with a status filter. */
function SqlBoard({ rows, loading, showBdr }: { rows?: SqlRow[]; loading: boolean; showBdr?: boolean }) {
  const [filter, setFilter] = useState<'all' | 'open' | 'qualified' | 'rejected'>('all');
  const list = rows ?? [];
  const groups = useMemo(() => ({
    open: list.filter((s) => OPEN.includes(s.status)),
    qualified: list.filter((s) => s.status === 'QUALIFIED_SQL'),
    rejected: list.filter((s) => s.status === 'REJECTED_NOT_ICP' || s.status === 'DISQUALIFIED'),
  }), [list]);
  if (loading) return <SkeletonRows />;
  if (!list.length) return <div className="rounded-[24px] border border-line/80 bg-white"><Empty icon={<ClipboardCheck className="h-5 w-5" />} title="No SQLs yet" body="Submit an SQL from an account page once the L1 is booked." /></div>;

  const byStatus = (Object.keys(STATUS) as SqlStatus[]).map((k) => ({ name: STATUS[k].label, value: list.filter((s) => s.status === k).length, color: STATUS[k].color })).filter((d) => d.value);
  const byBdr = Object.entries(list.reduce<Record<string, { n: number; ok: number }>>((m, s) => {
    const e = m[s.submittedBy] ?? { n: 0, ok: 0 }; e.n++; if (s.status === 'QUALIFIED_SQL') e.ok++; m[s.submittedBy] = e; return m;
  }, {}));
  const shown = filter === 'all' ? list : groups[filter];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard title="Where every SQL stands" subtitle={`${list.length} submitted`} className="lg:col-span-3">
          <Donut height={200} sub="SQLs" data={byStatus} />
        </ChartCard>
        <ChartCard title={showBdr ? 'Approval rate by BDR' : 'Your approval rate'} subtitle="Qualified ÷ submitted" className="lg:col-span-2">
          <div className="flex flex-wrap justify-center gap-3">
            {byBdr.map(([name, v]) => <RadialGauge key={name} size={showBdr ? 104 : 150} value={(100 * v.ok) / v.n} label={showBdr ? name : 'Approved'} sub={`${v.ok} of ${v.n}`} />)}
          </div>
        </ChartCard>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {([['all', 'All', list.length], ['open', 'In progress', groups.open.length], ['qualified', 'Qualified', groups.qualified.length], ['rejected', 'Rejected', groups.rejected.length]] as const).map(([k, l, n]) => (
          <button key={k} onClick={() => setFilter(k)} className={cn('flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-all', filter === k ? 'border-brand-forest bg-brand-forest text-white shadow-[0_8px_18px_-10px_rgba(5,63,26,.8)]' : 'border-line bg-white text-brand-forest hover:border-brand-forest/30')}>
            {l}<span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', filter === k ? 'bg-brand-mint text-brand-night' : 'bg-brand-forest-50')}>{n}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((s) => {
          const S = STATUS[s.status];
          return (
            <Link key={s.id} to={`/accounts/${s.accountId}`} className="group relative overflow-hidden rounded-[22px] border border-line/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-forest/25 hover:shadow-[0_20px_40px_-26px_rgba(5,63,26,.65)]">
              <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: S.color }} />
              <div className="flex items-start gap-3">
                <EntityTile name={s.accountName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold group-hover:text-brand-forest">{s.accountName}</p>
                  <p className="text-[11.5px] text-brand-forest/70">{showBdr ? `${s.submittedBy} · ` : ''}{s.submittedAt ? relTime(s.submittedAt) : '—'}</p>
                </div>
                <S.icon className="h-4 w-4 shrink-0" style={{ color: S.color }} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <StatusPill status={s.status} />
                {s.sizeBucket && <Chip>{humanize(s.sizeBucket)}</Chip>}
                {s.intentRating && <Chip>{humanize(s.intentRating)} intent</Chip>}
                {s.smallException && <Chip tone="navy">Exception</Chip>}
              </div>
              <div className="mt-3"><Track status={s.status} /></div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
