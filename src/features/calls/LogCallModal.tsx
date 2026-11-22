import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, CheckCircle2, Info, PhoneCall } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { usePicklist } from '@/lib/queries';
import { addDaysISO, fmtDate, humanize } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { LogCallResult, OutcomePlan, PhoneView } from '@/lib/types';
import { Modal } from '@/components/ui/overlay';
import { Badge, Button, Field, Input, Select, Textarea } from '@/components/ui/ui';

/** Outcomes grouped the way a BDR thinks about a call, so the right one is one click away. */
const GROUPS: { title: string; codes: string[] }[] = [
  { title: 'No answer', codes: ['DID_NOT_PICK', 'SWITCH_OFF', 'INCOMING_BARRED'] },
  { title: 'Spoke to them', codes: ['L1_BOOKED', 'CALL_LATER', 'CALL_AFTER_MONTH', 'ASKED_DETAILS', 'EMAIL_SENT', 'REMINDED'] },
  { title: 'Someone else', codes: ['REFERRED', 'NOT_RIGHT_STAKEHOLDER'] },
  { title: 'Not a fit', codes: ['NOT_INTERESTED', 'ALREADY_USING', 'NOT_POSSIBLE', 'WRONG_ICP', 'NOT_ASSOCIATED', 'WRONG_NUMBER'] },
];
const NEEDS_DATE = new Set(['CALL_LATER', 'CALL_AFTER_MONTH']);
const NEEDS_REASON = new Set(['NOT_INTERESTED', 'ALREADY_USING']);
const NEEDS_REFERRAL = new Set(['REFERRED', 'NOT_RIGHT_STAKEHOLDER']);

export interface CallTarget { stakeholderId: string; name: string; designation?: string; accountName?: string; phones?: PhoneView[] }

export function LogCallModal({ open, onClose, target, onLogged, saveAndNext }: {
  open: boolean; onClose: () => void; target: CallTarget | null;
  onLogged?: (r: LogCallResult, next: boolean) => void; saveAndNext?: boolean;
}) {
  const outcomes = usePicklist('CALL_OUTCOME');
  const [code, setCode] = useState('');
  const [remark, setRemark] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [reason, setReason] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [ref, setRef] = useState({ fullName: '', designation: '', email: '', phone: '' });

  useEffect(() => {
    if (!open) return;
    setCode(''); setRemark(''); setFollowUpDate(''); setReason(''); setTaskDue('');
    setRef({ fullName: '', designation: '', email: '', phone: '' });
    setPhoneId(target?.phones?.find((p) => p.primary && p.valid)?.id ?? target?.phones?.find((p) => p.valid)?.id ?? '');
  }, [open, target]);

  const labels = useMemo(() => Object.fromEntries((outcomes.data ?? []).map((o) => [o.code, o.label])), [outcomes.data]);

  // Preview shows exactly what the rule table will do before the BDR saves (M2-3: plan editable before save).
  const preview = useQuery({
    queryKey: ['call-preview', target?.stakeholderId, code, followUpDate, reason],
    queryFn: () => api.get<OutcomePlan>(`/api/stakeholders/${target!.stakeholderId}/calls/preview`,
      { outcome: code, followUpDate: followUpDate || undefined, reason: reason || undefined }),
    enabled: open && !!target && !!code && (!NEEDS_DATE.has(code) || !!followUpDate),
    retry: false,
  });

  const log = useAction((next: boolean) => api.post<LogCallResult>(`/api/stakeholders/${target!.stakeholderId}/calls`, {
    outcomeCode: code,
    phoneId: phoneId || null,
    remark: remark || null,
    followUpDate: followUpDate || null,
    reason: reason || null,
    overrideTaskDue: taskDue || null,
    referral: NEEDS_REFERRAL.has(code) && ref.fullName ? {
      fullName: ref.fullName, designation: ref.designation || null,
      emails: ref.email ? [ref.email] : [], phones: ref.phone ? [ref.phone] : [], linkedinUrl: null,
    } : null,
  }).then((r) => ({ r, next })), {
    success: 'Call logged',
    invalidate: [['my-day'], ['account'], ['stakeholders'], ['tasks'], ['dashboard']],
    onSuccess: ({ r, next }) => { onLogged?.(r, next); if (!next) onClose(); },
  });

  const missing = !code ? 'Pick an outcome'
    : NEEDS_DATE.has(code) && !followUpDate ? 'Pick the follow-up date'
    : NEEDS_REASON.has(code) && !reason.trim() ? 'Add the reason'
    : NEEDS_REFERRAL.has(code) && !ref.fullName.trim() ? 'Add the referred person’s name'
    : null;

  const plan = preview.data;

  return (
    <Modal open={open} onClose={onClose} width="max-w-2xl"
      title={<span className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-accent" />Log call · {target?.name}</span>}
      subtitle={[target?.designation, target?.accountName].filter(Boolean).join(' · ')}
      footer={<>
        {missing && <span className="mr-auto text-xs text-ink-muted">{missing}</span>}
        <Button onClick={onClose}>Cancel</Button>
        {saveAndNext && <Button disabled={!!missing} loading={log.isPending && log.variables === true} onClick={() => log.mutate(true)}>Save &amp; next <ArrowRight className="h-3.5 w-3.5" /></Button>}
        <Button variant="primary" disabled={!!missing} loading={log.isPending && log.variables === false} onClick={() => log.mutate(false)}>Save</Button>
      </>}>
      <div className="space-y-5">
        {target?.phones && target.phones.length > 1 && (
          <Field label="Number dialled">
            <Select value={phoneId} onChange={(e) => setPhoneId(e.target.value)}>
              {target.phones.map((p) => <option key={p.id} value={p.id} disabled={!p.valid}>{p.e164}{p.primary ? ' (primary)' : ''}{!p.valid ? ' — invalid' : ''}</option>)}
            </Select>
          </Field>
        )}

        <div className="space-y-3">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-muted/80">{g.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.codes.filter((c) => labels[c]).map((c) => (
                  <button key={c} onClick={() => setCode(c)}
                    className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
                      code === c ? 'border-accent bg-accent text-white shadow-card' : 'border-line bg-white text-ink-soft hover:border-accent/40 hover:text-ink',
                      c === 'L1_BOOKED' && code !== c && 'border-success/40 text-success')}>
                    {labels[c]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {NEEDS_DATE.has(code) && (
          <Field label="Call back on" required>
            <div className="flex items-center gap-2">
              <Input type="date" value={followUpDate} min={addDaysISO(0)} onChange={(e) => setFollowUpDate(e.target.value)} className="w-44" />
              {[1, 3, 7, 30].map((d) => (
                <Button key={d} size="sm" variant="ghost" onClick={() => setFollowUpDate(addDaysISO(d))}>{d === 1 ? 'Tomorrow' : d === 30 ? '1 month' : `${d} days`}</Button>
              ))}
            </div>
          </Field>
        )}
        {NEEDS_REASON.has(code) && (
          <Field label="Why?" required><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Using Zaggle for FBP" /></Field>
        )}
        {NEEDS_REFERRAL.has(code) && (
          <div className="rounded-lg border border-line bg-canvas/60 p-3">
            <p className="mb-2 text-xs font-medium text-ink-soft">Who did they refer you to?</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Full name *" value={ref.fullName} onChange={(e) => setRef({ ...ref, fullName: e.target.value })} />
              <Input placeholder="Designation" value={ref.designation} onChange={(e) => setRef({ ...ref, designation: e.target.value })} />
              <Input placeholder="Email" value={ref.email} onChange={(e) => setRef({ ...ref, email: e.target.value })} />
              <Input placeholder="Phone" value={ref.phone} onChange={(e) => setRef({ ...ref, phone: e.target.value })} />
            </div>
          </div>
        )}

        <Field label="Remark"><Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="What was said? (optional)" /></Field>

        {code && (
          <div className="rounded-lg border border-accent/20 bg-accent-soft/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-accent"><Info className="h-3.5 w-3.5" />What happens when you save</p>
            {NEEDS_DATE.has(code) && !followUpDate && <p className="text-xs text-ink-muted">Pick the call-back date to see the plan.</p>}
            {preview.isFetching && !plan && <p className="text-xs text-ink-muted">Working it out…</p>}
            {preview.error && <p className="text-xs text-danger">{(preview.error as Error).message}</p>}
            {plan && (
              <ul className="space-y-1.5 text-[13px] text-ink-soft">
                {plan.newStatus && <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success" />Status becomes <Badge tone="accent">{humanize(plan.newStatus)}</Badge></li>}
                {plan.taskType && (
                  <li className="flex flex-wrap items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5 text-accent" />
                    {humanize(plan.taskType)} task on <b className="font-medium text-ink">{fmtDate(taskDue || plan.taskDue)}</b>
                    <Input type="date" className="h-7 w-40" value={taskDue || plan.taskDue || ''} onChange={(e) => setTaskDue(e.target.value)} title="Change the date" />
                  </li>
                )}
                {plan.revisitOn && <li className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 text-ink-muted" />Revisit on {fmtDate(plan.revisitOn)}</li>}
                {plan.maxAttemptsReached && <li className="text-warning">Attempt {plan.attemptsAfter}: marked unresponsive. Try another stakeholder at this company.</li>}
                {plan.markPhoneInvalid && <li>This number is marked invalid; the stakeholder stays open.</li>}
                {plan.setIcpFitNo && <li>Account is marked as not an ICP fit.</li>}
                {plan.offerSequence && <li>You can start an email sequence after saving.</li>}
                {plan.openL1Booking && <li className="font-medium text-success">Next: submit the SQL and book the L1 meeting.</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
