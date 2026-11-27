import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, CheckCircle2, Clock, Info, PhoneCall, PhoneOff, ThumbsUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { usePicklist } from '@/lib/queries';
import { addDaysISO, fmtDate, humanize } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { LogCallResult, OutcomePlan, PhoneView } from '@/lib/types';
import { Modal } from '@/components/ui/overlay';
import { Badge, Button, Field, Input, Select, Textarea } from '@/components/ui/ui';
import { useT } from '@/lib/i18n';

/** Outcomes grouped the way a BDR thinks about a call, so the right one is one click away. */
const GROUPS: { title: string; codes: string[] }[] = [
  { title: 'call.groupNoAnswer', codes: ['DID_NOT_PICK', 'SWITCH_OFF', 'INCOMING_BARRED'] },
  { title: 'call.groupSpoke', codes: ['L1_BOOKED', 'CALL_LATER', 'CALL_AFTER_MONTH', 'ASKED_DETAILS', 'EMAIL_SENT', 'REMINDED'] },
  { title: 'call.groupSomeoneElse', codes: ['REFERRED', 'NOT_RIGHT_STAKEHOLDER'] },
  { title: 'call.groupNotFit', codes: ['NOT_INTERESTED', 'ALREADY_USING', 'NOT_POSSIBLE', 'WRONG_ICP', 'NOT_ASSOCIATED', 'WRONG_NUMBER'] },
];
const NEEDS_DATE = new Set(['CALL_LATER', 'CALL_AFTER_MONTH']);
const NO_ANSWER = new Set(GROUPS[0].codes);

/** The simple flow: Not connected → reminder task · Connected → Postponed (call-back task) or Interested (book L1, then SQL). */
type Path = '' | 'NOT_CONNECTED' | 'POSTPONED' | 'INTERESTED' | 'OTHER';
const pathFor = (c: string): Path => (!c ? '' : NO_ANSWER.has(c) ? 'NOT_CONNECTED' : c === 'L1_BOOKED' ? 'INTERESTED' : NEEDS_DATE.has(c) ? 'POSTPONED' : 'OTHER');
const NEEDS_REASON = new Set(['NOT_INTERESTED', 'ALREADY_USING']);
const NEEDS_REFERRAL = new Set(['REFERRED', 'NOT_RIGHT_STAKEHOLDER']);

export interface CallTarget { stakeholderId: string; name: string; designation?: string; accountName?: string; phones?: PhoneView[] }

export function LogCallModal({ open, onClose, target, onLogged, saveAndNext }: {
  open: boolean; onClose: () => void; target: CallTarget | null;
  onLogged?: (r: LogCallResult, next: boolean) => void; saveAndNext?: boolean;
}) {
  const t = useT();
  const outcomes = usePicklist('CALL_OUTCOME');
  const [code, setCode] = useState('');
  const [remark, setRemark] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [reason, setReason] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [ref, setRef] = useState({ fullName: '', designation: '', email: '', phone: '' });
  const [connected, setConnected] = useState<boolean | null>(null);
  const [path, setPath] = useState<Path>('');

  useEffect(() => {
    if (!open) return;
    setConnected(null); setPath('');
    setCode(''); setRemark(''); setFollowUpDate(''); setReason(''); setTaskDue('');
    setRef({ fullName: '', designation: '', email: '', phone: '' });
    setPhoneId(target?.phones?.find((p) => p.primary && p.valid)?.id ?? target?.phones?.find((p) => p.valid)?.id ?? '');
  }, [open, target]);

  const labels = useMemo(() => Object.fromEntries((outcomes.data ?? []).map((o) => [o.code, o.label])), [outcomes.data]);

  // Picking a path picks the outcome code the backend rules already understand.
  function choose(c: string, p: Path = pathFor(c)) { setCode(c); setPath(p); setTaskDue(''); setFollowUpDate((d) => (NEEDS_DATE.has(c) ? d : '')); }
  function pickConnected(v: boolean) {
    setConnected(v);
    if (v) { setCode(''); setPath(''); } else choose('DID_NOT_PICK', 'NOT_CONNECTED');
  }

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
    success: t('call.logged'),
    invalidate: [['my-day'], ['account'], ['stakeholders'], ['tasks'], ['dashboard']],
    onSuccess: ({ r, next }) => { onLogged?.(r, next); if (!next) onClose(); },
  });

  const missing = connected === null ? 'Connected or not connected?'
    : !code ? t('call.pickOutcome')
    : NEEDS_DATE.has(code) && !followUpDate ? t('call.pickDate')
    : NEEDS_REASON.has(code) && !reason.trim() ? t('call.addReason')
    : NEEDS_REFERRAL.has(code) && !ref.fullName.trim() ? t('call.addReferral')
    : null;

  const plan = preview.data;

  return (
    <Modal open={open} onClose={onClose} width="max-w-2xl"
      title={<span className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-forest text-white"><PhoneCall className="h-4 w-4" /></span>{t('call.title')} · {target?.name}</span>}
      subtitle={[target?.designation, target?.accountName].filter(Boolean).join(' · ')}
      footer={<>
        {missing && <span className="mr-auto text-xs text-ink-muted">{missing}</span>}
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        {saveAndNext && <Button disabled={!!missing} loading={log.isPending && log.variables === true} onClick={() => log.mutate(true)}>{t('common.saveNext')} <ArrowRight className="h-3.5 w-3.5" /></Button>}
        <Button variant="primary" disabled={!!missing} loading={log.isPending && log.variables === false} onClick={() => log.mutate(false)}>{path === 'INTERESTED' ? 'Save & book L1' : t('common.save')}</Button>
      </>}>
      <div className="space-y-5">
        {target?.phones && target.phones.length > 1 && (
          <Field label={t('call.numberDialled')}>
            <Select value={phoneId} onChange={(e) => setPhoneId(e.target.value)}>
              {target.phones.map((p) => <option key={p.id} value={p.id} disabled={!p.valid}>{p.e164}{p.primary ? ' (primary)' : ''}{!p.valid ? ' — invalid' : ''}</option>)}
            </Select>
          </Field>
        )}

        <div>
          <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-muted/80">How did the call go?</p>
          <div className="grid grid-cols-2 gap-2">
            <BigChoice active={connected === true} onClick={() => pickConnected(true)} icon={<PhoneCall className="h-4 w-4" />} title="Connected" sub="You spoke to them" />
            <BigChoice active={connected === false} onClick={() => pickConnected(false)} icon={<PhoneOff className="h-4 w-4" />} title="Not connected" sub="No answer, switched off, busy" />
          </div>
        </div>

        {connected === true && (
          <div>
            <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-muted/80">What did they say?</p>
            <div className="grid grid-cols-2 gap-2">
              <BigChoice active={path === 'INTERESTED'} onClick={() => choose('L1_BOOKED', 'INTERESTED')} icon={<ThumbsUp className="h-4 w-4" />} title="Interested" sub="Book the L1 meeting, then fill the SQL" />
              <BigChoice active={path === 'POSTPONED'} onClick={() => choose('CALL_LATER', 'POSTPONED')} icon={<Clock className="h-4 w-4" />} title="Postponed" sub="Asked to be called later" />
            </div>
            <button type="button" onClick={() => { setCode(''); setPath(path === 'OTHER' ? '' : 'OTHER'); }} className="mt-2 text-xs font-semibold text-brand-forest hover:underline">
              {path === 'OTHER' ? 'Hide other outcomes' : 'Something else? (not interested, referred, wrong person…)'}
            </button>
          </div>
        )}

        {connected === true && path === 'OTHER' && (
          <div className="space-y-3 rounded-2xl border border-line bg-canvas/50 p-3">
            <div className="space-y-3">
              {GROUPS.slice(1).map((g) => (
                <div key={g.title}>
                  <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-muted/80">{t(g.title)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.codes.filter((c) => labels[c] && c !== 'L1_BOOKED' && c !== 'CALL_LATER').map((c) => (
                      <button key={c} onClick={() => choose(c, 'OTHER')}
                        className={cn('rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
                          code === c ? 'border-brand-forest bg-brand-forest text-white shadow-[0_6px_14px_-8px_rgba(5,63,26,.9)]' : 'border-line bg-white text-ink-soft hover:border-brand-forest/40 hover:text-ink',
                          c === 'L1_BOOKED' && code !== c && 'border-brand-mint/50 bg-[#E6F5EA] text-[#1A7F36]')}>
                        {t(`outcome.${c}`, undefined, labels[c])}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {path === 'NOT_CONNECTED' && (
          <Field label="Remind me to call again on" hint="Added to your Tasks">
            <div className="flex flex-wrap items-center gap-2">
              <Input type="date" value={taskDue || plan?.taskDue || ''} min={addDaysISO(0)} onChange={(e) => setTaskDue(e.target.value)} className="w-44" />
              {[0, 1, 2, 7].map((d) => (
                <Button key={d} size="sm" variant="ghost" onClick={() => setTaskDue(addDaysISO(d))}>{d === 0 ? 'Later today' : d === 1 ? t('common.tomorrow') : t('common.days', { n: d })}</Button>
              ))}
            </div>
          </Field>
        )}

        {NEEDS_DATE.has(code) && (
          <Field label={path === 'POSTPONED' ? 'When should you call back?' : t('call.callBackOn')} required hint={path === 'POSTPONED' ? 'Added to your Tasks' : undefined}>
            <div className="flex items-center gap-2">
              <Input type="date" value={followUpDate} min={addDaysISO(0)} onChange={(e) => setFollowUpDate(e.target.value)} className="w-44" />
              {[1, 3, 7, 30].map((d) => (
                <Button key={d} size="sm" variant="ghost" onClick={() => setFollowUpDate(addDaysISO(d))}>{d === 1 ? t('common.tomorrow') : d === 30 ? t('common.oneMonth') : t('common.days', { n: d })}</Button>
              ))}
            </div>
          </Field>
        )}
        {NEEDS_REASON.has(code) && (
          <Field label={t('call.why')} required><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('call.whyPlaceholder')} /></Field>
        )}
        {NEEDS_REFERRAL.has(code) && (
          <div className="rounded-2xl border border-line bg-canvas/60 p-4">
            <p className="mb-2 text-xs font-medium text-ink-soft">{t('call.referredWho')}</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder={t('call.fullName')} value={ref.fullName} onChange={(e) => setRef({ ...ref, fullName: e.target.value })} />
              <Input placeholder={t('call.designation')} value={ref.designation} onChange={(e) => setRef({ ...ref, designation: e.target.value })} />
              <Input placeholder={t('call.email')} value={ref.email} onChange={(e) => setRef({ ...ref, email: e.target.value })} />
              <Input placeholder={t('call.phone')} value={ref.phone} onChange={(e) => setRef({ ...ref, phone: e.target.value })} />
            </div>
          </div>
        )}

        <Field label={t('call.remark')}><Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={t('call.remarkPlaceholder')} /></Field>

        {code && (
          <div className="rounded-2xl border border-brand-forest/15 bg-brand-forest-50/70 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-brand-forest"><Info className="h-3.5 w-3.5" />{t('call.whatHappens')}</p>
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
                    {path !== 'NOT_CONNECTED' && <Input type="date" className="h-7 w-40" value={taskDue || plan.taskDue || ''} onChange={(e) => setTaskDue(e.target.value)} title="Change the date" />}
                  </li>
                )}
                {plan.revisitOn && <li className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 text-ink-muted" />Revisit on {fmtDate(plan.revisitOn)}</li>}
                {plan.maxAttemptsReached && <li className="text-warning">Attempt {plan.attemptsAfter}: marked unresponsive. Try another stakeholder at this company.</li>}
                {plan.markPhoneInvalid && <li>This number is marked invalid; the stakeholder stays open.</li>}
                {plan.setIcpFitNo && <li>Account is marked as not an ICP fit.</li>}
                {plan.openL1Booking && <li className="font-medium text-success">Next: book the L1 meeting, then fill in the SQL.</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function BigChoice({ active, onClick, icon, title, sub }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all',
        active ? 'border-brand-forest bg-brand-forest text-white shadow-[0_10px_24px_-14px_rgba(5,63,26,.9)]' : 'border-line bg-white hover:border-brand-forest/40')}>
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', active ? 'bg-brand-mint text-brand-night' : 'bg-brand-forest-50 text-brand-forest')}>{icon}</span>
      <span><span className="block text-[14px] font-semibold">{title}</span><span className={cn('block text-xs', active ? 'text-white/70' : 'text-ink-muted')}>{sub}</span></span>
    </button>
  );
}