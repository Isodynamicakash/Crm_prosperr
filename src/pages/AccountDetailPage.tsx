import { WhatsAppButton } from '@/features/calls/WhatsApp';
import { SequenceButton } from '@/features/outreach/Sequence';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Ban, Building2, CalendarClock, CalendarPlus, CheckCircle2, ClipboardCheck, ExternalLink, Linkedin, Mail, MessageSquare, MoreHorizontal,
  Pencil, Phone, PhoneCall, PhoneOff, Plus, RotateCcw, ShieldAlert, Star, StickyNote, UserCog, Users, Video,
} from 'lucide-react';
import { api } from '@/lib/api';
import { isLeadership, useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { useCities, usePicklist } from '@/lib/queries';
import { cn } from '@/lib/cn';
import { fmtDate, fmtDateTime, fullName, humanize, num, relTime } from '@/lib/format';
import type { AccountPage, ActivityType, Department, MeetingRow, StakeholderView, TimelineEvent } from '@/lib/types';
import { Avatar, Badge, Button, Card, CardHeader, Empty, EntityTile, Field, Input, Select, Skeleton, Textarea } from '@/components/ui/ui';
import { TopoLines } from '@/components/brand/TopoLines';
import { Confirm, Modal } from '@/components/ui/overlay';
import { EngagementBadge, StageBadge, StageJourney, StatusBadge, TemperatureBadge } from '@/components/ui/status';
import { LogCallModal, type CallTarget } from '@/features/calls/LogCallModal';
import { AddStakeholderModal, EditAccountModal, EditStakeholderModal } from '@/features/accounts/AccountForms';
import { AssignModal, SubmitSqlModal } from '@/features/sql/SqlForms';
import { BookMeetingModal, KeepActiveModal, MoveInactiveModal, ReactivateModal, RecordOutcomeModal, RescheduleMeetingModal, type MeetingRef } from '@/features/pipeline/PipelineForms';
import { OpportunityPanel } from '@/features/pipeline/OpportunityPanel';

const DEPT_ORDER: Department[] = ['FINANCE', 'HR', 'PAYROLL', 'OTHER'];
interface Coverage { function: Department; engaged: boolean; bestLevel?: number; stakeholders: number }
interface Multithreading { coverage: Partial<Record<Department, Coverage>>; needsMultithreading: boolean; onlyJuniorEngaged: boolean; suggestedNext?: { id: string; name: string; department?: string; level?: number } | null }

type Dialog = null | 'stakeholder' | 'sql' | 'assign' | 'book' | 'inactive' | 'keep' | 'reactivate' | 'activity' | 'edit';

/** One page per account: who's who, what happened, what's next — with every action one click away. */
export default function AccountDetailPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const role = user?.role;
  const { data, isLoading, error } = useQuery({ queryKey: ['account', id], queryFn: () => api.get<AccountPage>(`/api/accounts/${id}`) });
  const mt = useQuery({ queryKey: ['account', id, 'mt'], queryFn: () => api.get<Multithreading>(`/api/accounts/${id}/multithreading`), enabled: !!data && data.account.zone === 'PIPELINE' });
  const cities = useCities();
  const industries = usePicklist('INDUSTRY');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [call, setCall] = useState<CallTarget | null>(null);
  const [outcomeFor, setOutcomeFor] = useState<MeetingRef | null>(null);
  const [rescheduleFor, setRescheduleFor] = useState<(MeetingRef & { scheduledStart?: string; meetingLink?: string }) | null>(null);
  const highlight = params.get('stakeholder');

  useEffect(() => {
    if (highlight) setTimeout(() => document.getElementById(`s-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  }, [highlight, data]);

  const stakeholders = useMemo(() => DEPT_ORDER.flatMap((d) => data?.stakeholdersByDepartment[d] ?? []), [data]);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-16 w-1/2" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !data) return <Empty icon={<ShieldAlert className="h-5 w-5" />} title="Can’t open this account" body={(error as Error)?.message} action={<Link to="/accounts"><Button>Back to accounts</Button></Link>} />;

  const a = data.account;
  const ae = data.owners.find((o) => o.role === 'AE');
  const bdrs = data.owners.filter((o) => o.role !== 'AE');
  const isMyAccount = role === 'AE' ? ae?.id === user?.id : role === 'BDR' ? bdrs.some((b) => b.id === user?.id) : true;
  const inPipeline = a.zone === 'PIPELINE';
  const canWorkProspect = role === 'BDR' || isLeadership(role);
  const canAeAct = (role === 'AE' && isMyAccount) || isLeadership(role);
  // Backend allows the assigned AE, leadership, or the BDR who booked the meeting.
  const canReschedule = canAeAct || (role === 'BDR' && isMyAccount);
  const reschedule = (m: MeetingRow) => setRescheduleFor({ id: m.id, level: m.level, accountId: a.id, accountName: a.name, scheduledStart: m.scheduledStart, meetingLink: m.meetingLink });
  const city = cities.data?.find((c) => c.id === a.cityId);
  const industry = industries.data?.find((i) => i.id === a.industryId);
  const openMeetings = data.meetings.filter((m) => !m.outcome && ['SCHEDULED', 'RESCHEDULED'].includes(m.status));

  return (
    <div>
      <Link to="/accounts" className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-white hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" />Accounts</Link>

      {/* Header: dark hero with the stage journey */}
      <section className="on-dark relative isolate mb-5 overflow-hidden rounded-[28px] bg-[#141614] px-5 py-5 text-paper sm:px-7 sm:py-6">
        <TopoLines levels={11} className="-z-10 opacity-70" />
        <div className="absolute -left-20 bottom-[-40%] -z-10 h-64 w-[460px] rounded-full bg-brand-mint/[0.14] blur-[100px]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <EntityTile name={a.name} size="lg" className="from-brand-mint to-[#0E5A2A] ring-4 ring-white/10" />
            <div className="min-w-0">
              <h1 className="font-display text-[28px] font-medium leading-tight tracking-[-0.04em] sm:text-[34px]">{a.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-paper/60">
                {a.website && <a href={a.website.startsWith('http') ? a.website : `https://${a.website}`} target="_blank" rel="noreferrer" className="mr-1 inline-flex items-center gap-1 hover:text-brand-mint">{a.domain ?? a.website}<ExternalLink className="h-3 w-3" /></a>}
                <StageBadge stage={a.stage} /><StatusBadge status={a.status} />
                {a.sizeBucket && <Badge>{humanize(a.sizeBucket)}</Badge>}
                {data.opportunity?.temperature && <TemperatureBadge t={data.opportunity.temperature} />}
                {a.reviewFlaggedAt && a.status === 'ACTIVE' && <Badge tone="warning">Flagged — no activity</Badge>}
                {a.icpFit === 'NO' && <Badge tone="danger">Not ICP</Badge>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canWorkProspect && <Button icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDialog('stakeholder')}>Stakeholder</Button>}
            <Button icon={<StickyNote className="h-3.5 w-3.5" />} onClick={() => setDialog('activity')}>Log activity</Button>
            {canWorkProspect && !inPipeline && a.status === 'ACTIVE' && <Button variant="primary" icon={<ClipboardCheck className="h-3.5 w-3.5" />} onClick={() => setDialog('sql')}>Submit SQL</Button>}
            {canAeAct && inPipeline && a.status === 'ACTIVE' && <Button icon={<CalendarPlus className="h-3.5 w-3.5" />} onClick={() => setDialog('book')}>Book meeting</Button>}
            {isLeadership(role) && inPipeline && <Button icon={<UserCog className="h-3.5 w-3.5" />} onClick={() => setDialog('assign')}>{ae ? 'Reassign AE' : 'Assign AE'}</Button>}
            {canAeAct && a.reviewFlaggedAt && a.status === 'ACTIVE' && <Button variant="primary" onClick={() => setDialog('keep')}>Keep active</Button>}
            {canAeAct && inPipeline && a.status === 'ACTIVE' && <Button variant="ghost" onClick={() => setDialog('inactive')}>Move to inactive</Button>}
            {a.status === 'INACTIVE' && (canWorkProspect || canAeAct) && <Button variant="primary" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setDialog('reactivate')}>Reactivate</Button>}
          </div>
        </div>
        <StageJourney stage={a.stage} />
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Expected MRR', data.opportunity?.expectedMrr ? `₹${num(data.opportunity.expectedMrr)}` : '—', data.opportunity?.licenseCount ? `${num(data.opportunity.licenseCount)} licences` : (a.licensePotential ? `${num(a.licensePotential)} licence potential` : undefined)],
            ['Stakeholders', stakeholders.length, `${DEPT_ORDER.filter((d) => data.stakeholdersByDepartment[d]?.length).length} functions covered`],
            ['Meetings', data.meetings.length, openMeetings.length ? `${openMeetings.length} upcoming` : 'None upcoming'],
            ['Last activity', relTime(a.lastActivityAt) || '—', a.nextStep ? `Next: ${a.nextStep}` : 'No next step set'],
          ].map(([l, v, h]) => (
            <div key={l as string} className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-paper/45">{l}</p>
              <p className="mt-1.5 truncate font-display text-[24px] font-medium leading-none tracking-[-0.04em]">{v}</p>
              {h && <p className="mt-1 truncate text-[11.5px] text-paper/45">{h}</p>}
            </div>
          ))}
        </div>
      </section>

      {a.status === 'INACTIVE' && (
        <div className="mb-4 rounded-[20px] border border-line bg-white p-4 text-[13px]">
          <b>Inactive</b> since {fmtDate(a.inactiveSince)}{a.inactiveRemark && <> — “{a.inactiveRemark}”</>}{a.revisitOn && <> · revisit on <b>{fmtDate(a.revisitOn)}</b></>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          {openMeetings.length > 0 && (
            <div className="space-y-2">
              {openMeetings.map((m) => {
                const past = new Date(m.scheduledStart) < new Date();
                return (
                  <div key={m.id} className={cn('flex flex-wrap items-center gap-3 rounded-[20px] border p-3.5', past ? 'border-[#202E64]/30 bg-[#E9EBF3]' : 'border-brand-forest/15 bg-brand-forest-50/70')}>
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-white', past ? 'bg-[#202E64]' : 'bg-brand-forest')}><Video className="h-4 w-4" /></span>
                    <p className="flex-1 text-[13px]"><b>{m.level}{m.alsoCompletesL2 ? ' + L2' : ''}</b> {past ? 'was' : 'is'} on {fmtDateTime(m.scheduledStart)}{m.ae && ` with ${m.ae}`}{m.attendees && ` · ${m.attendees}`}</p>
                    {m.meetingLink && !past && <a href={m.meetingLink} target="_blank" rel="noreferrer"><Button size="sm">Join</Button></a>}
                    {canReschedule && <Button size="sm" variant={past ? 'ghost' : 'secondary'} icon={<CalendarClock className="h-3.5 w-3.5" />} onClick={() => reschedule(m)}>Reschedule</Button>}
                    {past && canAeAct && <Button size="sm" variant="primary" onClick={() => setOutcomeFor({ id: m.id, level: m.level, accountId: a.id, accountName: a.name })}>Record outcome</Button>}
                  </div>
                );
              })}
            </div>
          )}

          {data.opportunity && <OpportunityPanel opportunityId={data.opportunity.id} canEdit={canAeAct} aeName={ae?.name} />}

          <Card>
            <CardHeader title={`Stakeholders · ${stakeholders.length}`} subtitle="Grouped by function, most senior first."
              action={canWorkProspect && <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDialog('stakeholder')}>Add</Button>} />
            {stakeholders.length === 0 ? (
              <Empty icon={<Users className="h-5 w-5" />} title="No stakeholders yet" body="Add the CFO, HR head or payroll lead to start calling." />
            ) : (
              <div className="p-2">
                {DEPT_ORDER.filter((d) => data.stakeholdersByDepartment[d]?.length).map((d) => (
                  <div key={d} className="mb-1">
                    <p className="flex items-center gap-2 px-1 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted"><span className="h-1.5 w-1.5 rounded-full bg-brand-mint" />{humanize(d)}<span className="font-normal normal-case tracking-normal">· {data.stakeholdersByDepartment[d]!.length}</span></p>
                    {data.stakeholdersByDepartment[d]!.map((s) => (
                      <StakeholderRow key={s.id} s={s} highlight={s.id === highlight} accountId={a.id}
                        onCall={() => setCall({ stakeholderId: s.id, name: fullName(s.firstName, s.lastName), designation: s.designation, accountName: a.name, phones: s.phones })} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Meetings meetings={data.meetings} canAct={canAeAct} canReschedule={canReschedule} onReschedule={reschedule} onOutcome={(m) => setOutcomeFor({ id: m.id, level: m.level, accountId: a.id, accountName: a.name })} />
          <Timeline events={data.timeline} stakeholders={stakeholders} />
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <p className="mb-3 text-[13px] font-semibold">Owners</p>
            <div className="space-y-2.5">
              <OwnerRow label="AE" name={ae?.name} />
              {bdrs.length ? bdrs.map((b) => <OwnerRow key={b.id} label={humanize(b.role)} name={b.name} />) : <OwnerRow label="BDR" />}
            </div>
          </Card>

          {(data.workedBy?.length ?? 0) > 0 && (
            <Card className="p-4">
              <p className="mb-1 text-[13px] font-semibold">Already worked by</p>
              <p className="mb-3 text-xs text-ink-muted">Check before calling, so two people don’t chase the same contacts.</p>
              <ul className="space-y-2.5">
                {data.workedBy!.map((w) => (
                  <li key={w.userId} className="flex items-center gap-2.5 text-[13px]">
                    <Avatar name={w.name} />
                    <span className="min-w-0 flex-1"><span className="font-semibold">{w.me ? 'You' : w.name}</span> <span className="text-ink-muted">· {humanize(w.role)}</span>
                      <span className="block text-xs text-ink-muted">{Number(w.calls)} call{Number(w.calls) === 1 ? '' : 's'} · {Number(w.touches)} touch{Number(w.touches) === 1 ? '' : 'es'} · last {relTime(w.lastAt)}</span></span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {mt.data && (
            <Card className="p-4">
              <p className="mb-3 flex items-center justify-between font-display text-[16px] font-medium">Coverage {mt.data.needsMultithreading && <Badge className="bg-brand-forest text-white">Multithread</Badge>}</p>
              <div className="grid grid-cols-3 gap-2">
                {(['FINANCE', 'HR', 'PAYROLL'] as Department[]).map((d) => {
                  const c = mt.data!.coverage[d];
                  return (
                    <div key={d} className={cn('rounded-2xl border p-2.5 text-center', c?.engaged ? 'border-brand-forest bg-brand-forest text-white shadow-[0_10px_20px_-12px_rgba(5,63,26,.9)]' : 'border-dashed border-line bg-canvas/60')}>
                      <p className={cn('text-[10.5px] font-semibold uppercase tracking-[0.1em]', c?.engaged ? 'text-white/60' : 'text-ink-muted')}>{humanize(d)}</p>
                      <p className={cn('mt-1 font-display text-[18px] font-medium leading-none', c?.engaged ? 'text-white' : 'text-ink-muted')}>{c?.engaged ? `L${c.bestLevel ?? '?'}` : c?.stakeholders ? 'Not engaged' : 'None'}</p>
                    </div>
                  );
                })}
              </div>
              {mt.data.onlyJuniorEngaged && <p className="mt-3 text-xs text-[#202E64]">Only junior contacts are engaged. Reach a senior.</p>}
              {mt.data.suggestedNext && <p className="mt-3 flex items-center gap-2 rounded-xl bg-brand-forest-50 px-3 py-2 text-xs text-brand-forest">Next best person: <b>{mt.data.suggestedNext.name}</b></p>}
            </Card>
          )}

          <Card className="p-4">
            <p className="mb-3 flex items-center justify-between text-[13px] font-semibold">Details
              {((canWorkProspect && !inPipeline) || canAeAct) && a.status === 'ACTIVE' && (
                <button onClick={() => setDialog('edit')} className="flex items-center gap-1 text-xs font-semibold text-brand-forest hover:underline"><Pencil className="h-3 w-3" />Edit</button>
              )}</p>
            <dl className="space-y-2 text-[13px]">
              {[['City', city ? `${city.name}${city.priority !== 'NONE' ? ` · ${city.priority}` : ''}` : '—'], ['Industry', industry?.label ?? '—'],
                ['Employees', num(a.employeeCount)], ['License potential', num(a.licensePotential)], ['Intent', humanize(a.intentRating)],
                ['Next step', a.nextStep ? `${a.nextStep} (${fmtDate(a.nextStepDue)})` : '—'], ['Last activity', relTime(a.lastActivityAt)],
                ['In pipeline since', fmtDate(a.pipelineSince)], ['Created', fmtDate(a.createdAt)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-ink-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
          </Card>
        </aside>
      </div>

      <LogCallModal open={!!call} target={call} onClose={() => setCall(null)}
        onLogged={(r) => { if (r.openL1Booking && !inPipeline) setDialog('sql'); }} />
      <AddStakeholderModal open={dialog === 'stakeholder'} onClose={() => setDialog(null)} accountId={a.id} stakeholders={stakeholders} />
      <SubmitSqlModal open={dialog === 'sql'} onClose={() => setDialog(null)} accountId={a.id} accountName={a.name} stakeholders={stakeholders} account={a} />
      <EditAccountModal open={dialog === 'edit'} onClose={() => setDialog(null)} account={a} />
      <AssignModal open={dialog === 'assign'} onClose={() => setDialog(null)} accountId={a.id} accountName={a.name} currentAeId={a.aeOwnerId} />
      <BookMeetingModal open={dialog === 'book'} onClose={() => setDialog(null)} accountId={a.id} stakeholders={stakeholders} stage={a.stage} aeId={a.aeOwnerId} />
      <MoveInactiveModal open={dialog === 'inactive'} onClose={() => setDialog(null)} accountId={a.id} />
      <KeepActiveModal open={dialog === 'keep'} onClose={() => setDialog(null)} accountId={a.id} />
      <ReactivateModal open={dialog === 'reactivate'} onClose={() => setDialog(null)} accountId={a.id} stakeholders={stakeholders} />
      <LogActivityModal open={dialog === 'activity'} onClose={() => setDialog(null)} accountId={a.id} stakeholders={stakeholders} />
      <RescheduleMeetingModal open={!!rescheduleFor} onClose={() => setRescheduleFor(null)} meeting={rescheduleFor} />
      <RecordOutcomeModal open={!!outcomeFor} onClose={() => setOutcomeFor(null)} meeting={outcomeFor} stakeholders={stakeholders} />
    </div>
  );
}

function OwnerRow({ label, name }: { label: string; name?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {name ? <Avatar name={name} /> : <span className="h-6 w-6 rounded-full border border-dashed border-line" />}
      <span className="flex-1 text-[13px]">{name ?? <span className="text-ink-muted">Not assigned</span>}</span>
      <span className="text-2xs text-ink-muted">{label}</span>
    </div>
  );
}

function StakeholderRow({ s, onCall, highlight, accountId }: { s: StakeholderView; onCall: () => void; highlight: boolean; accountId: string }) {
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const [dnc, setDnc] = useState(false);
  const [edit, setEdit] = useState(false);
  const phone = s.phones.find((p) => p.primary && p.valid) ?? s.phones.find((p) => p.valid);
  const email = s.emails.find((e) => e.primary) ?? s.emails[0];
  const invalidate = [['account', accountId]];
  const markInvalid = useAction((phoneId: string) => api.post(`/api/phones/${phoneId}/invalid`), { success: 'Number marked invalid', invalidate });
  const setDncAction = useAction(() => api.post(`/api/stakeholders/${s.id}/do-not-contact`, { reason: 'Asked not to be contacted' }), { success: 'Marked do-not-contact', invalidate, onSuccess: () => setDnc(false) });

  return (
    <div id={`s-${s.id}`} className={cn('group mb-1.5 flex flex-wrap items-center gap-3 rounded-[18px] border border-line/70 bg-white px-3.5 py-3 transition-all hover:border-brand-forest/25 hover:shadow-[0_12px_26px_-20px_rgba(5,63,26,.6)]', highlight && 'border-brand-mint ring-4 ring-brand-mint/15')}>
      <Avatar name={fullName(s.firstName, s.lastName)} size="md" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold">
          {fullName(s.firstName, s.lastName)}
          {s.level && <span className={cn('rounded-full px-1.5 py-px text-[10px] font-bold', s.level <= 1 ? 'bg-brand-forest text-white' : s.level === 2 ? 'bg-[#0E5A2A] text-white' : s.level === 3 ? 'bg-brand-mint text-brand-night' : 'bg-black/[0.06] text-ink-soft')}>L{s.level}</span>}
          {s.primarySpoc && <Star className="h-3 w-3 fill-warning text-warning" aria-label="Primary SPOC" />}
          {s.decisionMaker && <Badge tone="accent">DM</Badge>}
          {s.doNotContact && <Badge tone="danger"><Ban className="h-3 w-3" />DNC</Badge>}
          {s.masked && <Badge>Another BDR’s contact</Badge>}
        </p>
        <p className="truncate text-xs text-ink-muted">{s.designation ?? '—'}{s.level ? ` · L${s.level}` : s.designation ? ' · no level' : ''}{s.callAttempts > 0 && ` · ${s.callAttempts} call${s.callAttempts > 1 ? 's' : ''}`}{s.lastInteractionAt && ` · last ${relTime(s.lastInteractionAt)}`}</p>
      </div>
      <EngagementBadge status={s.engagement} />
      <div className="flex items-center gap-1">
        {email && <a href={`mailto:${email.email}`} title={email.email}><Button size="icon" variant="ghost"><Mail className="h-4 w-4" /></Button></a>}
        {s.linkedinUrl && <a href={s.linkedinUrl.startsWith('http') ? s.linkedinUrl : `https://${s.linkedinUrl}`} target="_blank" rel="noreferrer"><Button size="icon" variant="ghost"><Linkedin className="h-4 w-4" /></Button></a>}
        {phone && !s.doNotContact && !s.masked && (
          <a href={`tel:${phone.e164}`} onClick={onCall} title={phone.e164}>
            <Button size="sm" icon={<Phone className="h-3.5 w-3.5" />}><span className="tabular-nums">{phone.e164}</span></Button>
          </a>
        )}
        {phone && !s.doNotContact && !s.masked && <WhatsAppButton phone={phone.e164} name={s.firstName} onOpened={onCall} compact />}
        {!s.doNotContact && !s.masked && <Button size="sm" variant="subtle" icon={<PhoneCall className="h-3.5 w-3.5" />} onClick={onCall}>Log</Button>}
        {(user?.role === 'AE' || user?.role === 'MANAGER') && !s.doNotContact && !s.masked && <SequenceButton stakeholderId={s.id} accountId={accountId} hasEmail={s.emails.some((e) => e.valid !== false)} />}
        {!s.masked && (
          <div className="relative">
            <Button size="icon" variant="ghost" onClick={() => setMenu((m) => !m)}><MoreHorizontal className="h-4 w-4" /></Button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-9 z-20 w-56 rounded-lg border border-line bg-white p-1 shadow-pop animate-pop-in">
                  <button onClick={() => { setMenu(false); setEdit(true); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-canvas">
                    <Pencil className="h-3.5 w-3.5 text-ink-muted" />Edit details
                  </button>
                  {s.phones.filter((p) => p.valid).map((p) => (
                    <button key={p.id} onClick={() => { setMenu(false); markInvalid.mutate(p.id); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-canvas">
                      <PhoneOff className="h-3.5 w-3.5 text-ink-muted" />Mark {p.e164} wrong
                    </button>
                  ))}
                  {!s.doNotContact && (
                    <button onClick={() => { setMenu(false); setDnc(true); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-danger hover:bg-danger-soft">
                      <Ban className="h-3.5 w-3.5" />Do not contact
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <EditStakeholderModal open={edit} onClose={() => setEdit(false)} accountId={accountId} stakeholder={s} />
      <Confirm open={dnc} onClose={() => setDnc(false)} onConfirm={() => setDncAction.mutate(undefined)} loading={setDncAction.isPending} danger confirmLabel="Mark do-not-contact"
        title={`Stop contacting ${s.firstName}?`} body="Sequences stop and this person is excluded from calling lists. This is kept for privacy compliance." />
    </div>
  );
}

function Meetings({ meetings, canAct, canReschedule, onReschedule, onOutcome }: { meetings: MeetingRow[]; canAct: boolean; canReschedule: boolean; onReschedule: (m: MeetingRow) => void; onOutcome: (m: MeetingRow) => void }) {
  if (!meetings.length) return null;
  const tone = (m: MeetingRow) => m.status === 'COMPLETED' ? 'success' : m.status === 'NO_SHOW' ? 'danger' : m.status === 'CANCELLED' ? 'neutral' : 'accent';
  return (
    <Card>
      <CardHeader title={`Meetings · ${meetings.length}`} />
      <ul className="space-y-1.5 p-3">
        {meetings.map((m) => (
          <li key={m.id} className="flex flex-wrap items-start gap-3 rounded-[18px] border border-line/70 bg-white px-3.5 py-3">
            <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-[13px] font-semibold', m.status === 'COMPLETED' ? 'bg-brand-forest text-white' : 'bg-brand-forest-50 text-brand-forest')}>{m.level}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{fmtDateTime(m.scheduledStart)} <Badge tone={tone(m)} className="ml-1">{humanize(m.outcome ?? m.status)}</Badge></p>
              <p className="text-xs text-ink-muted">Booked by {m.bookedBy}{m.ae && ` · AE ${m.ae}`}{m.attendees && ` · ${m.attendees}`}</p>
              {m.notes && <p className="mt-1 text-xs text-ink-soft">{m.notes}</p>}
              {m.nextStep && <p className="mt-1 text-xs"><span className="text-ink-muted">Next:</span> {m.nextStep} ({fmtDate(m.nextStepDue)})</p>}
            </div>
            <div className="flex shrink-0 gap-1.5">
              {canReschedule && !m.outcome && ['SCHEDULED', 'RESCHEDULED'].includes(m.status) && <Button size="sm" variant="ghost" onClick={() => onReschedule(m)}>Reschedule</Button>}
              {canAct && !m.outcome && new Date(m.scheduledStart) < new Date() && <Button size="sm" onClick={() => onOutcome(m)}>Record outcome</Button>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const eventIcon: Record<string, typeof Phone> = { CALL: Phone, EMAIL: Mail, WHATSAPP: MessageSquare, LINKEDIN: Linkedin, MEETING: Video, NOTE: StickyNote, STATUS_CHANGE: CheckCircle2, REFERRAL: Users };

function Timeline({ events, stakeholders }: { events: TimelineEvent[]; stakeholders: StakeholderView[] }) {
  const [filter, setFilter] = useState('');
  const names = Object.fromEntries(stakeholders.map((s) => [s.id, fullName(s.firstName, s.lastName)]));
  const types = [...new Set(events.map((e) => e.type))];
  const shown = filter ? events.filter((e) => e.type === filter) : events;
  return (
    <Card>
      <CardHeader title="Activity" subtitle="Everything that happened, newest first."
        action={types.length > 1 && (
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40 rounded-full text-xs">
            <option value="">All activity</option>{types.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
          </Select>
        )} />
      {shown.length === 0 ? <Empty icon={<Building2 className="h-5 w-5" />} title="No activity yet" body="Calls, emails and meetings show up here." /> : (
        <ol className="relative px-5 pb-5 pt-3">
          {shown.map((e, i) => {
            const Icon = eventIcon[e.type] ?? StickyNote;
            return (
              <li key={`${e.kind}-${e.id}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                {i < shown.length - 1 && <span className="absolute left-[17px] top-9 h-[calc(100%-26px)] w-[2px] rounded-full bg-gradient-to-b from-brand-mint/40 to-line" />}
                <span className={cn('z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', i === 0 ? 'bg-brand-forest text-white shadow-[0_8px_18px_-8px_rgba(5,63,26,.9)]' : 'bg-brand-forest-50 text-brand-forest')}><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1 rounded-2xl bg-canvas/70 px-3.5 py-2.5">
                  <p className="text-[13px]"><span className="font-semibold">{humanize(e.type)}</span>{e.stakeholderId && names[e.stakeholderId] && <span className="text-ink-muted"> · {names[e.stakeholderId]}</span>}</p>
                  {e.summary && <p className="mt-0.5 whitespace-pre-line text-xs text-ink-soft">{e.summary}</p>}
                  <p className="mt-0.5 text-2xs text-ink-muted">{fmtDateTime(e.at)}{e.byName && ` · ${e.byName}`}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

const ACTIVITY_TYPES: ActivityType[] = ['WHATSAPP', 'LINKEDIN', 'EMAIL', 'OFFICE_VISIT', 'NOTE'];

function LogActivityModal({ open, onClose, accountId, stakeholders }: { open: boolean; onClose: () => void; accountId: string; stakeholders: StakeholderView[] }) {
  const [type, setType] = useState<ActivityType>('WHATSAPP');
  const [sid, setSid] = useState('');
  const [remarks, setRemarks] = useState('');
  const [when, setWhen] = useState('');
  useEffect(() => { if (open) { setType('WHATSAPP'); setSid(''); setRemarks(''); setWhen(''); } }, [open]);
  const save = useAction(() => api.post('/api/activities', { accountId, stakeholderId: sid || null, type, remarks, occurredAt: when ? new Date(when).toISOString() : null }), {
    success: 'Activity logged', invalidate: [['account', accountId]], onSuccess: onClose,
  });
  return (
    <Modal open={open} onClose={onClose} title="Log activity"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!remarks.trim()} loading={save.isPending} onClick={() => save.mutate(undefined)}>Log</Button></>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-medium', type === t ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent/40')}>{humanize(t)}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="With">
            <Select value={sid} onChange={(e) => setSid(e.target.value)}>
              <option value="">Account (no one specific)</option>
              {stakeholders.filter((s) => !s.masked).map((s) => <option key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</option>)}
            </Select>
          </Field>
          <Field label="When" hint="Leave empty for now"><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
        </div>
        <Field label="What happened" required><Textarea autoFocus rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}