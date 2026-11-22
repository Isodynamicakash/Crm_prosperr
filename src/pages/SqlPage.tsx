import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Inbox, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { isLeadership, useAuth } from '@/lib/auth';
import { fmtDateTime, humanize, relTime } from '@/lib/format';
import type { QueueRow, SqlRow, SqlStatus } from '@/lib/types';
import { Avatar, Badge, Button, Card, Empty, PageHeader, SkeletonRows, Tabs } from '@/components/ui/ui';
import { SqlBadge } from '@/components/ui/status';
import { AssignModal, ValidateSqlModal } from '@/features/sql/SqlForms';

const OPEN: SqlStatus[] = ['PENDING_QUALIFICATION', 'PENDING_SENIOR_CONNECTION', 'MEETING_BOOKED', 'NO_SHOW'];

export default function SqlPage() {
  const { user } = useAuth();
  return isLeadership(user?.role) ? <ManagerQueue /> : <MySqls />;
}

/** Manager (M5-1, M5-3): every SQL waits here to be validated and handed to an AE — nothing is auto-assigned. */
function ManagerQueue() {
  const [tab, setTab] = useState<'queue' | 'all'>('queue');
  const queue = useQuery({ queryKey: ['queue'], queryFn: () => api.get<QueueRow[]>('/api/assignment/queue') });
  const all = useQuery({ queryKey: ['sql', 'all'], queryFn: () => api.get<SqlRow[]>('/api/sql'), enabled: tab === 'all' });
  const [review, setReview] = useState<string | null>(null);
  const [assign, setAssign] = useState<{ id: string; name: string } | null>(null);
  const rows = queue.data ?? [];
  const toReview = rows.filter((r) => OPEN.includes(r.status));
  const toAssign = rows.filter((r) => r.status === 'QUALIFIED_SQL');

  return (
    <div>
      <PageHeader title="SQL queue" subtitle={`${toReview.length} to review · ${toAssign.length} approved and waiting for an AE`} />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'queue', label: 'Needs action', count: rows.length }, { value: 'all', label: 'All SQLs' }]} /></div>
      {tab === 'queue' ? (
        <Card>
          {queue.isLoading ? <SkeletonRows /> : rows.length === 0 ? (
            <Empty icon={<Inbox className="h-5 w-5" />} title="Queue is clear" body="New SQLs from BDRs show up here for review." />
          ) : (
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Account</th><th className="px-3 font-medium">Status</th><th className="px-3 font-medium">BDR</th>
                <th className="px-3 font-medium">L1 meeting</th><th className="px-3 font-medium">Flags</th><th className="px-4" /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.submissionId} className="border-b border-line/70 last:border-0 hover:bg-canvas">
                    <td className="px-4 py-3"><Link to={`/accounts/${r.accountId}`} className="font-medium hover:text-accent">{r.accountName}</Link>
                      <p className="text-2xs text-ink-muted">Submitted {relTime(r.submittedAt)}</p></td>
                    <td className="px-3"><SqlBadge status={r.status} /></td>
                    <td className="px-3"><span className="flex items-center gap-1.5"><Avatar name={r.submittedBy} size="xs" />{r.submittedBy}</span></td>
                    <td className="px-3 text-xs">{r.l1At ? fmtDateTime(r.l1At) : <span className="text-ink-muted">—</span>}</td>
                    <td className="px-3"><div className="flex gap-1">
                      {r.sizeBucket && <Badge>{humanize(r.sizeBucket)}</Badge>}
                      {r.locationPriority === 'P1' && <Badge tone="warning">P1 city</Badge>}
                      {r.smallException && <Badge tone="warning">Small exception</Badge>}
                    </div></td>
                    <td className="px-4 text-right">
                      {r.status === 'QUALIFIED_SQL'
                        ? <Button size="sm" variant="primary" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setAssign({ id: r.accountId, name: r.accountName })}>Assign AE</Button>
                        : <Button size="sm" variant="primary" icon={<ClipboardCheck className="h-3.5 w-3.5" />} onClick={() => setReview(r.submissionId)}>Review</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : <SqlTable rows={all.data} loading={all.isLoading} showBdr />}
      <ValidateSqlModal open={!!review} submissionId={review} onClose={() => setReview(null)} onApproved={(id, name) => setAssign({ id, name })} />
      <AssignModal open={!!assign} accountId={assign?.id ?? null} accountName={assign?.name} onClose={() => setAssign(null)} />
    </div>
  );
}

/** BDR view: every SQL they submitted and where it stands. */
function MySqls() {
  const { data, isLoading } = useQuery({ queryKey: ['sql', 'mine'], queryFn: () => api.get<SqlRow[]>('/api/sql') });
  const approved = data?.filter((s) => s.status === 'QUALIFIED_SQL').length ?? 0;
  return (
    <div>
      <PageHeader title="My SQLs" subtitle={data ? `${data.length} submitted · ${approved} approved` : undefined} />
      <SqlTable rows={data} loading={isLoading} />
    </div>
  );
}

function SqlTable({ rows, loading, showBdr }: { rows?: SqlRow[]; loading: boolean; showBdr?: boolean }) {
  return (
    <Card>
      {loading ? <SkeletonRows /> : !rows?.length ? (
        <Empty icon={<ClipboardCheck className="h-5 w-5" />} title="No SQLs yet" body="Submit an SQL from an account page once the L1 is booked." />
      ) : (
        <table className="w-full text-[13px]">
          <thead><tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-ink-muted">
            <th className="px-4 py-2.5 font-medium">Account</th><th className="px-3 font-medium">Status</th>{showBdr && <th className="px-3 font-medium">BDR</th>}
            <th className="px-3 font-medium">Size</th><th className="px-4 text-right font-medium">Submitted</th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-line/70 last:border-0 hover:bg-canvas">
                <td className="px-4 py-2.5"><Link to={`/accounts/${s.accountId}`} className="font-medium hover:text-accent">{s.accountName}</Link></td>
                <td className="px-3"><SqlBadge status={s.status} /></td>
                {showBdr && <td className="px-3">{s.submittedBy}</td>}
                <td className="px-3 text-xs text-ink-muted">{humanize(s.sizeBucket)}{s.smallException && ' · exception'}</td>
                <td className="px-4 text-right text-xs text-ink-muted">{fmtDateTime(s.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
