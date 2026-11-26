import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, MailCheck, Pause, Play, Send, Square } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAction } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { relTime } from '@/lib/format';
import { AnimatedNumber, Button, Card, Empty, PageHeader, SkeletonRows, Tabs } from '@/components/ui/ui';
import { SequenceStatus, STOP_LABEL, type Enrollment } from '@/features/outreach/Sequence';

interface Row extends Enrollment {
  id: string; stakeholder: string; account: string; stakeholderId: string; accountId: string; designation?: string;
  sent: number; steps: number; startedAt: string; replyAt?: string;
}
interface Monitor { enrollments: Row[]; failedLast7Days: { enrollmentId: string; to: string; error: string; at: string }[]; overdue: unknown[] }

type Filter = 'live' | 'replied' | 'ended' | 'all';

/** Every email sequence the BDR started (managers see the team's): progress, replies, and pause / resume / stop. */
export default function SequencesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Filter>('live');
  const q = useQuery({ queryKey: ['sequences', 'monitor'], queryFn: () => api.get<Monitor>('/api/sequences/monitor'), refetchInterval: 60_000 });
  const rows = q.data?.enrollments ?? [];
  const counts = useMemo(() => ({
    live: rows.filter((r) => r.status === 'RUNNING' || r.status === 'PAUSED').length,
    replied: rows.filter((r) => r.stopReason === 'REPLY').length,
    ended: rows.filter((r) => r.status === 'COMPLETED' || r.status === 'STOPPED').length,
    sent: rows.reduce((a, r) => a + Number(r.sent ?? 0), 0),
  }), [rows]);
  const replyRate = rows.length ? Math.round((100 * counts.replied) / rows.length) : 0;
  const shown = rows.filter((r) => tab === 'all' ? true : tab === 'live' ? (r.status === 'RUNNING' || r.status === 'PAUSED')
    : tab === 'replied' ? r.stopReason === 'REPLY' : (r.status === 'COMPLETED' || r.status === 'STOPPED'));

  return (
    <div>
      <PageHeader title="Email sequences" icon={<Send />} eyebrow="Outreach"
        subtitle={user?.role === 'MANAGER' ? 'Sequences across the team.' : 'Three emails from your own Gmail, then a reminder to call. Start one from any contact on an account.'}
        stats={[
          { label: 'Running', value: <AnimatedNumber value={counts.live} />, hint: 'Sending on schedule' },
          { label: 'Replied', value: <AnimatedNumber value={counts.replied} />, hint: `${replyRate}% reply rate` },
          { label: 'Emails sent', value: <AnimatedNumber value={counts.sent} />, hint: 'All time' },
        ]} />

      {(q.data?.failedLast7Days.length ?? 0) > 0 && (
        <Card className="mb-4 flex items-start gap-3 border-brand-navy/20 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy" />
          <div className="min-w-0 text-[13px]">
            <p className="font-semibold">{q.data!.failedLast7Days.length} email{q.data!.failedLast7Days.length > 1 ? 's' : ''} could not be sent this week</p>
            <p className="mt-0.5 truncate text-ink-muted">{q.data!.failedLast7Days[0].error}</p>
            <p className="mt-1 text-xs text-ink-muted">Usually Google needs reconnecting. The CRM retries, and pauses a sequence after 3 failures.</p>
          </div>
        </Card>
      )}

      <Card>
        <div className="border-b border-line px-3 pt-2">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'live', label: 'Running', count: counts.live }, { value: 'replied', label: 'Replied', count: counts.replied },
            { value: 'ended', label: 'Ended', count: counts.ended }, { value: 'all', label: 'All', count: rows.length }]} />
        </div>
        {q.isLoading ? <SkeletonRows /> : shown.length === 0 ? (
          <Empty icon={<MailCheck className="h-5 w-5" />} title={tab === 'live' ? 'No sequences running' : 'Nothing here yet'}
            body="Open an account, find a contact with an email, and press Sequence to preview and start." action={<Link to="/accounts"><Button>Go to accounts</Button></Link>} />
        ) : (
          <ul className="divide-y divide-line/70">
            {shown.map((r) => <SequenceRow key={r.id} r={r} />)}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SequenceRow({ r }: { r: Row }) {
  const invalidate = [['sequences'], ['sequence', r.stakeholderId]];
  const pause = useAction(async (v: boolean) => { await api.post(`/api/sequences/enrollments/${r.id}/pause?pause=${v}`); return v; }, { success: (v) => v ? 'Paused' : 'Resumed', invalidate });
  const stop = useAction(() => api.post(`/api/sequences/enrollments/${r.id}/stop`), { success: 'Stopped', invalidate });
  const total = Number(r.steps || 3), sent = Number(r.sent || 0);
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <Link to={`/accounts/${r.accountId}?stakeholder=${r.stakeholderId}`} className="block truncate text-[14px] font-semibold hover:text-brand-forest">{r.stakeholder}</Link>
        <p className="truncate text-xs text-ink-muted">{[r.designation, r.account].filter(Boolean).join(' · ')} · started {relTime(r.startedAt)}</p>
      </div>
      <div className="flex items-center gap-1" title={`${sent} of ${total} emails sent`}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn('h-1.5 w-6 rounded-full', i < sent ? 'bg-brand-forest' : 'bg-brand-forest/15')} />
        ))}
        <span className="ml-1.5 w-8 text-xs tabular-nums text-ink-muted">{sent}/{total}</span>
      </div>
      <div className="w-56 text-right">
        <SequenceStatus e={r} />
        {r.replyAt && <p className="mt-0.5 text-[11px] text-ink-muted">Replied {relTime(r.replyAt)}</p>}
        {r.status === 'STOPPED' && r.stopReason && !STOP_LABEL[r.stopReason] && <p className="text-[11px] text-ink-muted">{r.stopReason}</p>}
      </div>
      <div className="flex w-[150px] justify-end gap-1">
        {r.status === 'RUNNING' && <Button size="sm" variant="ghost" icon={<Pause className="h-3.5 w-3.5" />} loading={pause.isPending} onClick={() => pause.mutate(true)}>Pause</Button>}
        {r.status === 'PAUSED' && <Button size="sm" variant="ghost" icon={<Play className="h-3.5 w-3.5" />} loading={pause.isPending} onClick={() => pause.mutate(false)}>Resume</Button>}
        {(r.status === 'RUNNING' || r.status === 'PAUSED') && <Button size="sm" variant="ghost" icon={<Square className="h-3.5 w-3.5" />} loading={stop.isPending} onClick={() => stop.mutate(undefined)}>Stop</Button>}
      </div>
    </li>
  );
}