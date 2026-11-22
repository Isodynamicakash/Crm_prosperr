import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { usePicklist } from '@/lib/queries';
import { addDaysISO, isPastLocal, localToInstant, nowLocalInput } from '@/lib/format';
import type { MeetingLevel, MeetingOutcome, StakeholderView } from '@/lib/types';
import { Modal } from '@/components/ui/overlay';
import { Button, Checkbox, Field, Input, Select, Textarea } from '@/components/ui/ui';

const OUTCOMES: { value: MeetingOutcome; label: string; hint: string }[] = [
  { value: 'COMPLETED_QUALIFIED', label: 'Done — moving ahead', hint: 'Stage advances' },
  { value: 'COMPLETED_FOLLOW_UP', label: 'Done — needs follow-up', hint: 'Add the next step' },
  { value: 'COMPLETED_NOT_INTERESTED', label: 'Done — not interested', hint: '' },
  { value: 'NO_SHOW', label: 'No-show', hint: 'BDR gets a reschedule task' },
  { value: 'RESCHEDULED', label: 'Rescheduled', hint: 'Pick the new time' },
  { value: 'DISQUALIFIED', label: 'Disqualified', hint: '' },
];

export interface MeetingRef { id: string; level: MeetingLevel; accountId: string; accountName?: string }

/** AE records what happened in the meeting; overdue outcomes nag until this is done. */
export function RecordOutcomeModal({ open, onClose, meeting, stakeholders = [] }: {
  open: boolean; onClose: () => void; meeting: MeetingRef | null; stakeholders?: StakeholderView[];
}) {
  const [outcome, setOutcome] = useState<MeetingOutcome>('COMPLETED_QUALIFIED');
  const [notes, setNotes] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [nextStepDue, setNextStepDue] = useState(addDaysISO(3));
  const [attended, setAttended] = useState<string[]>([]);
  const [newStart, setNewStart] = useState('');
  useEffect(() => { if (open) { setOutcome('COMPLETED_QUALIFIED'); setNotes(''); setNextStep(''); setNextStepDue(addDaysISO(3)); setAttended([]); setNewStart(''); } }, [open]);

  const save = useAction(async () => {
    if (outcome === 'RESCHEDULED') {
      const s = localToInstant(newStart)!;
      return api.post(`/api/meetings/${meeting!.id}/reschedule`, { scheduledStart: s, scheduledEnd: new Date(new Date(s).getTime() + 30 * 60000).toISOString(), meetingLink: null });
    }
    return api.post(`/api/meetings/${meeting!.id}/outcome`, {
      outcome, notes: notes || null, nextStep: nextStep || null, nextStepDue: nextStep ? nextStepDue : null, attendedStakeholderIds: attended,
    });
  }, { success: 'Meeting updated', invalidate: [['account'], ['opportunity'], ['overdue-outcomes'], ['dashboard'], ['accounts'], ['tasks']], onSuccess: onClose });

  const completed = outcome.startsWith('COMPLETED');
  const blocked = outcome === 'RESCHEDULED' ? !newStart || isPastLocal(newStart) : outcome === 'COMPLETED_FOLLOW_UP' && !nextStep.trim();

  return (
    <Modal open={open} onClose={onClose} title={`Record ${meeting?.level ?? ''} outcome`} subtitle={meeting?.accountName}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={blocked} loading={save.isPending} onClick={() => save.mutate(undefined)}>Save outcome</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {OUTCOMES.map((o) => (
            <button key={o.value} onClick={() => setOutcome(o.value)}
              className={`rounded-lg border px-3 py-2 text-left transition-all ${outcome === o.value ? 'border-accent bg-accent-soft/60 ring-1 ring-accent/30' : 'border-line hover:border-ink-muted/30'}`}>
              <p className="text-[13px] font-medium">{o.label}</p>
              {o.hint && <p className="text-2xs text-ink-muted">{o.hint}</p>}
            </button>
          ))}
        </div>
        {outcome === 'RESCHEDULED' ? (
          <Field label="New date & time (IST)" required error={isPastLocal(newStart) ? 'This time is in the past. Pick a future date and time.' : undefined}><Input type="datetime-local" min={nowLocalInput()} value={newStart} onChange={(e) => setNewStart(e.target.value)} /></Field>
        ) : (
          <>
            <Field label="Notes"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Key points, objections, who said what" /></Field>
            <div className="grid grid-cols-[1fr_160px] gap-3">
              <Field label="Next step" required={outcome === 'COMPLETED_FOLLOW_UP'}><Input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Share commercials with CFO" /></Field>
              <Field label="Due"><Input type="date" value={nextStepDue} onChange={(e) => setNextStepDue(e.target.value)} /></Field>
            </div>
            {completed && stakeholders.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-soft">Who attended?</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {stakeholders.map((s) => (
                    <Checkbox key={s.id} checked={attended.includes(s.id)} label={`${s.firstName} ${s.lastName ?? ''}`}
                      onChange={(v) => setAttended(v ? [...attended, s.id] : attended.filter((x) => x !== s.id))} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

export function BookMeetingModal({ open, onClose, accountId, stakeholders = [] }: {
  open: boolean; onClose: () => void; accountId: string; stakeholders?: StakeholderView[];
}) {
  const [level, setLevel] = useState<MeetingLevel>('L2');
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState('45');
  const [link, setLink] = useState('');
  const [attendees, setAttendees] = useState<string[]>([]);
  useEffect(() => { if (open) { setLevel('L2'); setStart(''); setDuration('45'); setLink(''); setAttendees([]); } }, [open]);

  const save = useAction(() => {
    const s = localToInstant(start)!;
    return api.post(`/api/accounts/${accountId}/meetings`, {
      level, alsoCompletesL2: false, scheduledStart: s, scheduledEnd: new Date(new Date(s).getTime() + Number(duration) * 60000).toISOString(),
      meetingLink: link || null, attendeeStakeholderIds: attendees,
    });
  }, { success: 'Meeting booked', invalidate: [['account', accountId], ['opportunity'], ['accounts'], ['tasks']], onSuccess: onClose });

  return (
    <Modal open={open} onClose={onClose} title="Book meeting"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!start || isPastLocal(start)} loading={save.isPending} onClick={() => save.mutate(undefined)}>Book</Button></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Level"><Select value={level} onChange={(e) => setLevel(e.target.value as MeetingLevel)}>{(['L1', 'L2', 'L3', 'OTHER'] as const).map((l) => <option key={l}>{l}</option>)}</Select></Field>
        <Field label="Date & time (IST)" required className="col-span-2" error={isPastLocal(start) ? 'This time is in the past. Pick a future date and time.' : undefined}><Input type="datetime-local" min={nowLocalInput()} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Duration"><Select value={duration} onChange={(e) => setDuration(e.target.value)}>{[30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</Select></Field>
        <Field label="Meeting link" className="col-span-2"><Input value={link} onChange={(e) => setLink(e.target.value)} /></Field>
        {stakeholders.length > 0 && (
          <div className="col-span-3">
            <p className="mb-1.5 text-xs font-medium text-ink-soft">Attendees</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {stakeholders.map((s) => (
                <Checkbox key={s.id} checked={attendees.includes(s.id)} label={`${s.firstName} ${s.lastName ?? ''}`}
                  onChange={(v) => setAttendees(v ? [...attendees, s.id] : attendees.filter((x) => x !== s.id))} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Move an account to Inactive: reason, remark and (for some reasons) a revisit date are mandatory. */
export function MoveInactiveModal({ open, onClose, accountId }: { open: boolean; onClose: () => void; accountId: string }) {
  const reasons = usePicklist('INACTIVE_REASON');
  const [reasonId, setReasonId] = useState('');
  const [remark, setRemark] = useState('');
  const [revisitOn, setRevisitOn] = useState('');
  useEffect(() => { if (open) { setReasonId(''); setRemark(''); setRevisitOn(''); } }, [open]);
  const r = reasons.data?.find((x) => x.id === reasonId);

  const save = useAction(() => api.post<{ status: string }>(`/api/accounts/${accountId}/inactive`, { reasonId, remark, revisitOn: revisitOn || null }), {
    success: (res) => (res.status === 'PENDING_APPROVAL' ? 'Sent to your manager for approval' : 'Moved to Inactive'),
    invalidate: [['account', accountId], ['opportunity'], ['accounts'], ['dashboard'], ['to-be-moved']], onSuccess: onClose,
  });

  return (
    <Modal open={open} onClose={onClose} title="Move to Inactive" subtitle="The stage is kept, so it can come back where it left off."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" disabled={!reasonId || !remark.trim() || (r?.requiresRevisitDate && !revisitOn)} loading={save.isPending} onClick={() => save.mutate(undefined)}>Move to Inactive</Button></>}>
      <div className="space-y-3">
        <Field label="Reason" required>
          <Select value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
            <option value="">Select…</option>
            {reasons.data?.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </Select>
        </Field>
        <Field label="Remark" required><Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>
        <Field label="Revisit on" required={r?.requiresRevisitDate} hint="The BDR revival queue picks it up on this date">
          <Input type="date" min={addDaysISO(1)} value={revisitOn} onChange={(e) => setRevisitOn(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export function KeepActiveModal({ open, onClose, accountId }: { open: boolean; onClose: () => void; accountId: string }) {
  const [nextStep, setNextStep] = useState('');
  const [due, setDue] = useState(addDaysISO(7));
  useEffect(() => { if (open) { setNextStep(''); setDue(addDaysISO(7)); } }, [open]);
  const save = useAction(() => api.post(`/api/accounts/${accountId}/keep-active`, { nextStep, nextStepDue: due }), {
    success: 'Kept active', invalidate: [['account', accountId], ['opportunity'], ['accounts'], ['to-be-moved'], ['dashboard']], onSuccess: onClose,
  });
  return (
    <Modal open={open} onClose={onClose} title="Keep active" subtitle="Add a concrete next step so it doesn’t get flagged again."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!nextStep.trim()} loading={save.isPending} onClick={() => save.mutate(undefined)}>Keep active</Button></>}>
      <div className="grid grid-cols-[1fr_160px] gap-3">
        <Field label="Next step" required><Input autoFocus value={nextStep} onChange={(e) => setNextStep(e.target.value)} /></Field>
        <Field label="Due"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export function ReactivateModal({ open, onClose, accountId, stakeholders = [] }: { open: boolean; onClose: () => void; accountId: string; stakeholders?: StakeholderView[] }) {
  const reasons = usePicklist('REACTIVATION_REASON');
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');
  const [sid, setSid] = useState('');
  useEffect(() => { if (open) { setReasonId(''); setNote(''); setSid(''); } }, [open]);
  const save = useAction(() => api.post(`/api/accounts/${accountId}/reactivate`, { reasonId, note: note || null, newStakeholderId: sid || null }), {
    success: 'Account reactivated', invalidate: [['account', accountId], ['opportunity'], ['accounts'], ['revival'], ['dashboard']], onSuccess: onClose,
  });
  return (
    <Modal open={open} onClose={onClose} title="Reactivate account"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!reasonId} loading={save.isPending} onClick={() => save.mutate(undefined)}>Reactivate</Button></>}>
      <div className="space-y-3">
        <Field label="Reason" required>
          <Select value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
            <option value="">Select…</option>{reasons.data?.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </Select>
        </Field>
        {stakeholders.length > 0 && (
          <Field label="New stakeholder engaged (if any)">
            <Select value={sid} onChange={(e) => setSid(e.target.value)}>
              <option value="">—</option>{stakeholders.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName ?? ''} · {s.designation}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Note"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/** Move an upcoming meeting to a new time. The old slot is kept in history as Rescheduled. */
export function RescheduleMeetingModal({ open, onClose, meeting }: {
  open: boolean; onClose: () => void; meeting: (MeetingRef & { scheduledStart?: string; meetingLink?: string }) | null;
}) {
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState('30');
  const [link, setLink] = useState('');
  useEffect(() => { if (open) { setStart(''); setDuration('30'); setLink(meeting?.meetingLink ?? ''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useAction(() => {
    const s = localToInstant(start)!;
    return api.post(`/api/meetings/${meeting!.id}/reschedule`, {
      scheduledStart: s, scheduledEnd: new Date(new Date(s).getTime() + Number(duration) * 60000).toISOString(), meetingLink: link.trim() || null,
    });
  }, { success: 'Meeting rescheduled', invalidate: [['account'], ['opportunity'], ['accounts'], ['dashboard'], ['tasks']], onSuccess: onClose });

  return (
    <Modal open={open} onClose={onClose} title={`Reschedule ${meeting?.level ?? ''} meeting`}
      subtitle={meeting?.scheduledStart ? `Currently ${new Date(meeting.scheduledStart).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}` : meeting?.accountName}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!start || isPastLocal(start)} loading={save.isPending} onClick={() => save.mutate(undefined)}>Reschedule</Button></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="New date & time (IST)" required className="col-span-2" error={isPastLocal(start) ? 'This time is in the past. Pick a future date and time.' : undefined}>
          <Input type="datetime-local" autoFocus min={nowLocalInput()} value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Duration"><Select value={duration} onChange={(e) => setDuration(e.target.value)}>{[30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</Select></Field>
        <Field label="Meeting link" className="col-span-3"><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/…" /></Field>
      </div>
    </Modal>
  );
}
