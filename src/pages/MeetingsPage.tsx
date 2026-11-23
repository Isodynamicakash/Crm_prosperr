import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ExternalLink, Video } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDate, fmtDateTime, todayISO } from '@/lib/format';
import type { MeetingLevel } from '@/lib/types';
import { Badge, Button, Card, Empty, PageHeader } from '@/components/ui/ui';
import { RecordOutcomeModal, type MeetingRef } from '@/features/pipeline/PipelineForms';

interface MeetingRow {
  id: string;
  level: MeetingLevel;
  alsoCompletesL2: boolean;
  status: string;
  scheduledStart: string;
  scheduledEnd?: string;
  meetingLink?: string;
  nextStep?: string;
  nextStepDue?: string;
  bookedBy?: string;
  ae?: string;
  accountId: string;
  accountName: string;
  attendees?: string;
}

interface OverdueMeeting {
  id: string;
  level: MeetingLevel;
  scheduledStart: string;
  accountId: string;
  accountName: string;
}

const istDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function MeetingsPage() {
  const [outcomeFor, setOutcomeFor] = useState<MeetingRef | null>(null);
  const [activeView, setActiveView] = useState<'needs' | 'today' | 'upcoming'>('today');
  const schedule = useQuery({
    queryKey: ['meetings', 'schedule'],
    queryFn: () => api.get<MeetingRow[]>('/api/meetings/schedule'),
    refetchInterval: 30_000,
  });
  const overdue = useQuery({
    queryKey: ['overdue-outcomes'],
    queryFn: () => api.get<OverdueMeeting[]>('/api/meetings/overdue-outcomes'),
    refetchInterval: 30_000,
  });

  const meetings = schedule.data ?? [];
  const today = todayISO();
  const todayMeetings = meetings.filter((m) => istDate(m.scheduledStart) === today);
  const upcomingMeetings = meetings.filter((m) => istDate(m.scheduledStart) > today);
  const upcomingDates = Array.from(new Set(upcomingMeetings.map((m) => istDate(m.scheduledStart))));

  return (
    <div>
      <PageHeader
        title="Meetings"
        icon={<CalendarClock />}
        eyebrow="Meeting schedule"
        subtitle="Meetings due today and upcoming meetings across your leads."
        stats={[
          { label: 'Needs outcome', value: overdue.data?.length ?? 0, hint: 'Past meetings without an outcome', active: activeView === 'needs', onClick: () => setActiveView('needs') },
          { label: 'Today', value: todayMeetings.length, hint: 'Meetings scheduled for today', active: activeView === 'today', onClick: () => setActiveView('today') },
          { label: 'Upcoming', value: upcomingMeetings.length, hint: 'Future scheduled meetings', active: activeView === 'upcoming', onClick: () => setActiveView('upcoming') },
        ]}
      />

      {activeView === 'needs' && (
        <MeetingSection title="Needs outcome" subtitle="Past meetings that are still waiting for a result">
          {(overdue.data?.length ?? 0) === 0 ? (
            <Empty icon={<CalendarClock className="h-5 w-5" />} title="No meetings need an outcome" body="Past meetings will appear here until their outcome is recorded." />
          ) : overdue.data!.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={{
                ...meeting,
                alsoCompletesL2: false,
                status: 'SCHEDULED',
              }}
              needsOutcome
              onOutcome={() => setOutcomeFor({
                id: meeting.id,
                level: meeting.level,
                accountId: meeting.accountId,
                accountName: meeting.accountName,
              })}
            />
          ))}
        </MeetingSection>
      )}

      {activeView === 'today' && <MeetingSection title="Today" subtitle={fmtDate(today)}>
        {schedule.isLoading ? (
          <Card className="p-5 text-sm text-ink-muted">Loading meetings…</Card>
        ) : todayMeetings.length === 0 ? (
          <Empty icon={<CalendarClock className="h-5 w-5" />} title="No meetings today" body="There are no upcoming meetings left for today." />
        ) : todayMeetings.map((meeting) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            onOutcome={new Date(meeting.scheduledStart).getTime() <= Date.now()
              ? () => setOutcomeFor({ id: meeting.id, level: meeting.level, accountId: meeting.accountId, accountName: meeting.accountName })
              : undefined}
          />
        ))}
      </MeetingSection>}

      {activeView === 'upcoming' && <MeetingSection title="Upcoming" subtitle="Scheduled for future dates">
        {schedule.isLoading ? (
          <Card className="p-5 text-sm text-ink-muted">Loading meetings…</Card>
        ) : upcomingDates.length === 0 ? (
          <Empty icon={<CalendarClock className="h-5 w-5" />} title="No upcoming meetings" body="Meetings you schedule for your leads will appear here." />
        ) : upcomingDates.map((date) => (
          <div key={date} className="space-y-2">
            <p className="px-1 pt-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{fmtDate(date)}</p>
            {upcomingMeetings.filter((meeting) => istDate(meeting.scheduledStart) === date).map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ))}
      </MeetingSection>}

      <RecordOutcomeModal open={!!outcomeFor} onClose={() => setOutcomeFor(null)} meeting={outcomeFor} />
    </div>
  );
}

function MeetingSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-[24px] border border-line/80 bg-white p-4 sm:p-5">
      <div className="mb-3">
        <h2 className="font-display text-[18px] font-medium tracking-[-0.02em]">{title}</h2>
        <p className="text-xs text-ink-muted">{subtitle}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function MeetingCard({
  meeting,
  needsOutcome = false,
  onOutcome,
}: {
  meeting: MeetingRow;
  needsOutcome?: boolean;
  onOutcome?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <Card className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-forest-50 text-brand-forest">
        <Video className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={needsOutcome ? 'warning' : 'accent'}>{meeting.level}</Badge>
          {meeting.status && meeting.status !== 'SCHEDULED' && <Badge tone="neutral">{meeting.status}</Badge>}
        </div>
        <Link to={`/accounts/${meeting.accountId}`} className="mt-1 block truncate text-[14px] font-semibold text-ink hover:text-brand-forest hover:underline">
          {meeting.accountName}
        </Link>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          {fmtDateTime(meeting.scheduledStart)}
          {meeting.attendees ? ` · ${meeting.attendees}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {meeting.meetingLink && (
          <Button variant="secondary" icon={<ExternalLink className="h-3.5 w-3.5" />} onClick={() => window.open(meeting.meetingLink, '_blank', 'noopener,noreferrer')}>
            Join
          </Button>
        )}
        {onOutcome && <Button variant="primary" onClick={onOutcome}>Record outcome</Button>}
        <Button variant="ghost" onClick={() => navigate(`/accounts/${meeting.accountId}`)}>View account</Button>
      </div>
    </Card>
  );
}
