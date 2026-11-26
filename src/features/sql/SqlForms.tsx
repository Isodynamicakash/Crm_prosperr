import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, CircleDashed, Sparkles, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, useDebounced } from '@/lib/hooks';
import { usePicklist } from '@/lib/queries';
import { cn } from '@/lib/cn';
import { fmtDateTime, humanize, isPastLocal, localToInstant, nowLocalInput } from '@/lib/format';
import type { AccountView, CapacityRow, SqlChecklist, StakeholderView } from '@/lib/types';
import { Modal } from '@/components/ui/overlay';
import { Badge, Button, Checkbox, Field, Input, Select, Textarea } from '@/components/ui/ui';
import { SqlBadge } from '@/components/ui/status';
import { AiAssist } from '@/features/calls/VoiceNote';
import { EditAccountModal } from '@/features/accounts/AccountForms';
import { BusyStrip } from '@/features/integrations/Google';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';

interface SqlFill { transcript: string; budget: string | null; authority: string | null; need: string | null; timeline: string | null;
  businessRelevance: 'FBP' | 'PAYROLL' | 'BOTH' | null; budgetNote: string | null; authorityNote: string | null; needNote: string | null; timelineNote: string | null }

const criterionLabel: Record<string, string> = {
  LOCATION: 'Location', LICENSES: 'Licenses (taxable bracket)', RIGHT_STAKEHOLDER: 'Right stakeholder', BANT: 'BANT',
};

function CriterionIcon({ s }: { s: string }) {
  if (s === 'PASS') return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (s === 'FAIL') return <XCircle className="h-4 w-4 text-danger" />;
  return <CircleAlert className="h-4 w-4 text-warning" />;
}

/**
 * Submit SQL + book L1 in one step (M4-3/M4-4). The ICP checklist re-checks live as the BDR fills the form,
 * so they see exactly why it would pass or fail before they press submit.
 */
/** Missing SQL fields that live on the account (fixed in Edit account, not in the SQL form). */
const ACCOUNT_FIELDS = new Set(['city', 'cityId', 'licensePotential', 'employeeCount', 'industry', 'industryId', 'website']);

/** licensePotential -> "License potential", l1Booking -> "L1 booking", BANT stays BANT. */
const fieldLabel = (k: string) => (k.toLowerCase() === 'bant' ? 'BANT' : k === k.toUpperCase() ? k
  : (k.charAt(0).toUpperCase() + k.slice(1)).replace(/([a-z0-9])([A-Z])/g, (_, a, b) => `${a} ${b.toLowerCase()}`));

export function SubmitSqlModal({ open, onClose, accountId, accountName, stakeholders, account }: {
  open: boolean; onClose: () => void; accountId: string; accountName: string; stakeholders: StakeholderView[]; account?: AccountView;
}) {
  const t = useT();
  const { user } = useAuth();
  const [aiFilled, setAiFilled] = useState(false);
  const [step, setStep] = useState<'l1' | 'sql'>('l1');
  const [override, setOverride] = useState(false);   // BDR passes the SQL on high intent when the checklist isn't green   // book the L1 first, then the SQL details; both are submitted together
  const budget = usePicklist('BANT_BUDGET');
  const authority = usePicklist('BANT_AUTHORITY');
  const need = usePicklist('BANT_NEED');
  const timeline = usePicklist('BANT_TIMELINE');
  const init = {
    qualifyingStakeholderId: '', referringStakeholderId: '', businessRelevance: 'FBP',
    budgetId: '', budgetNote: '', authorityId: '', authorityNote: '', needId: '', needNote: '', timelineId: '', timelineNote: '',
    intentRating: '', intentReason: '', smallExceptionReason: '',
    start: '', durationMin: '30', meetingLink: '', alsoCompletesL2: false, attendees: [] as string[],
  };
  const [f, setF] = useState(init);
  useEffect(() => {
    if (!open) return;
    const best = [...stakeholders].sort((a, b) => a.priorityRank - b.priorityRank).find((s) => s.engagement === 'MEETING_SCHEDULED' || s.engagement === 'CONNECTED');
    setF({ ...init, qualifyingStakeholderId: best?.id ?? '', attendees: best ? [best.id] : [] });
    setAiFilled(false);
    setStep('l1');
    setOverride(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // AI returns option codes; map them to this server's picklist ids. Only empty fields are filled.
  const applyAi = (r: SqlFill) => {
    const id = (opts: { id: string; code: string }[] | undefined, code: string | null) => (code && opts?.find((o) => o.code === code)?.id) || '';
    setF((cur) => ({ ...cur,
      businessRelevance: r.businessRelevance ?? cur.businessRelevance,
      budgetId: cur.budgetId || id(budget.data, r.budget), authorityId: cur.authorityId || id(authority.data, r.authority),
      needId: cur.needId || id(need.data, r.need), timelineId: cur.timelineId || id(timeline.data, r.timeline),
      budgetNote: cur.budgetNote || r.budgetNote || '', authorityNote: cur.authorityNote || r.authorityNote || '',
      needNote: cur.needNote || r.needNote || '', timelineNote: cur.timelineNote || r.timelineNote || '' }));
    setAiFilled(true);
  };

  const body = useMemo(() => {
    const start = localToInstant(f.start);
    const end = start ? new Date(new Date(start).getTime() + Number(f.durationMin) * 60000).toISOString() : null;
    return {
      qualifyingStakeholderId: f.qualifyingStakeholderId || null,
      referringStakeholderId: f.referringStakeholderId || null,
      businessRelevance: f.businessRelevance,
      bant: {
        budgetId: f.budgetId || null, budgetNote: f.budgetNote || null, authorityId: f.authorityId || null, authorityNote: f.authorityNote || null,
        needId: f.needId || null, needNote: f.needNote || null, timelineId: f.timelineId || null, timelineNote: f.timelineNote || null,
      },
      smallExceptionReason: f.smallExceptionReason || null,
      intentRating: f.intentRating || null,
      intentReason: f.intentReason || null,
      highIntentOverride: override,
      l1: start ? { scheduledStart: start, scheduledEnd: end, meetingLink: f.meetingLink || null, attendeeStakeholderIds: f.attendees, alsoCompletesL2: f.alsoCompletesL2 } : null,
    };
  }, [f, override]);

  const debounced = useDebounced(body, 400);
  const check = useQuery({
    queryKey: ['sql-checklist', accountId, debounced],
    queryFn: () => api.post<SqlChecklist>(`/api/accounts/${accountId}/sql/checklist`, debounced),
    enabled: open && !!debounced.qualifyingStakeholderId,
    retry: false,
    placeholderData: (p) => p,
  });

  const submit = useAction(() => api.post<{ submissionId: string; needsApproval: boolean }>(`/api/accounts/${accountId}/sql`, body), {
    success: (r) => (r.needsApproval ? 'SQL submitted — waiting for manager approval. L1 is booked.' : 'SQL submitted and L1 booked'),
    invalidate: [['account', accountId], ['sql'], ['my-day'], ['dashboard'], ['accounts']],
    onSuccess: onClose,
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const c = check.data;
  const [fixing, setFixing] = useState(false);
  const needsIntent = !override && c?.criteria.some((x) => x.code === 'LOCATION' && x.status !== 'PASS');
  const MIN_WHY = 10;
  const overrideOk = override && f.intentReason.trim().length >= MIN_WHY;
  const canGo = (!!c?.canSubmit || overrideOk) && !isPastLocal(f.start);
  const needsSmall = c?.criteria.some((x) => x.code === 'LICENSES' && x.status !== 'PASS');
  const named = (s: StakeholderView) => `${s.firstName} ${s.lastName ?? ''} · ${s.designation ?? '—'}${s.level ? ` (L${s.level})` : ''}`;

  return (
    <Modal open={open} onClose={onClose} width={step === 'l1' ? 'max-w-2xl' : 'max-w-4xl'} title={step === 'l1' ? `Book L1 meeting · ${accountName}` : t('sql.title', { name: accountName })}
      subtitle={step === 'l1' ? 'Step 1 of 2 · when, how long, and who attends' : `Step 2 of 2 · ${t('sql.subtitle')}`}
      footer={step === 'l1' ? <>
        <span className="mr-auto text-xs text-ink-muted">{!f.start ? 'Step 1 of 2 · pick the L1 date and time' : isPastLocal(f.start) ? 'That time is in the past' : 'Step 1 of 2 · next, the SQL details'}</span>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" disabled={!f.start || isPastLocal(f.start)} onClick={() => setStep('sql')}>Next: SQL details <ArrowRight className="h-3.5 w-3.5" /></Button>
      </> : <>
        {override && <span className="mr-auto text-xs text-ink-muted">{overrideOk ? 'Submitting on high intent. Your reason goes with the SQL.' : `Write why it's high intent (at least ${MIN_WHY} characters)`}</span>}
        {!override && c && !c.canSubmit && <span className="mr-auto flex items-center gap-2 text-xs text-ink-muted">{c.missingFields.length ? t('sql.missing', { f: c.missingFields.map(fieldLabel).join(', ') }) : t('sql.icpFail')}
          {account && c.missingFields.some((k) => ACCOUNT_FIELDS.has(k)) && <button type="button" onClick={() => setFixing(true)} className="font-semibold text-brand-forest hover:underline">Fill in now</button>}</span>}
        <Button onClick={() => setStep('l1')}><ArrowLeft className="h-3.5 w-3.5" /> Back to L1</Button>
        <Button variant="primary" disabled={!canGo} loading={submit.isPending} onClick={() => submit.mutate(undefined)}>{t('sql.submit')}</Button>
      </>}>
      {account && <EditAccountModal open={fixing} onClose={() => setFixing(false)} account={account} focus={c?.missingFields} />}
      {step === 'l1' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-brand-forest/15 bg-brand-forest-50/70 px-4 py-3 text-[13px] text-brand-forest">Book the L1 meeting first. It's confirmed together with the SQL in the next step.</div>
          <section>
            <p className="mb-2 text-[13px] font-semibold">L1 meeting</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Date & time (IST)" required className="col-span-2" error={isPastLocal(f.start) ? 'This time is in the past. Pick a future date and time.' : undefined}><Input type="datetime-local" min={nowLocalInput()} value={f.start} onChange={set('start')} /></Field>
              {f.start && <div className="col-span-2"><BusyStrip local={f.start} durationMin={Number(f.durationMin)} userIds={[user?.id]} /></div>}
              <Field label="Duration">
                <Select value={f.durationMin} onChange={set('durationMin')}>{[30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</Select>
              </Field>
              <Field label="Meeting link" className="col-span-3"><Input value={f.meetingLink} onChange={set('meetingLink')} placeholder="https://meet.google.com/…" /></Field>
            </div>
            <p className="mb-1.5 mt-3 text-xs font-medium text-ink-soft">Attendees</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {stakeholders.map((s) => (
                <Checkbox key={s.id} checked={f.attendees.includes(s.id)} label={`${s.firstName} ${s.lastName ?? ''}`}
                  onChange={(v) => setF({ ...f, attendees: v ? [...f.attendees, s.id] : f.attendees.filter((x) => x !== s.id) })} />
              ))}
            </div>
            <div className="mt-2"><Checkbox checked={f.alsoCompletesL2} onChange={(v) => setF({ ...f, alsoCompletesL2: v })} label="This meeting also covers L2" /></div>
          </section>
        </div>
      ) : (
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <div>
            <AiAssist<SqlFill> endpoint="/api/ai/fill/SQL" onResult={applyAi} title={t('ai.sqlTitle')} example={t('ai.sqlExample')} />
            {aiFilled && <p className="mt-1.5 text-xs text-ink-muted">{t('ai.filledCheck')}</p>}
          </div>
          <section className="grid grid-cols-2 gap-3">
            <Field label={t('sql.qualifying')} required className="col-span-2">
              <Select value={f.qualifyingStakeholderId} onChange={set('qualifyingStakeholderId')}>
                <option value="">{t('sql.selectWho')}</option>
                {stakeholders.map((s) => <option key={s.id} value={s.id}>{named(s)}</option>)}
              </Select>
            </Field>
            <Field label={t('sql.referredBy')}>
              <Select value={f.referringStakeholderId} onChange={set('referringStakeholderId')}>
                <option value="">{t('sql.nobody')}</option>
                {stakeholders.filter((s) => s.id !== f.qualifyingStakeholderId).map((s) => <option key={s.id} value={s.id}>{named(s)}</option>)}
              </Select>
            </Field>
            <Field label={t('sql.relevance')} required>
              <Select value={f.businessRelevance} onChange={set('businessRelevance')}>
                <option value="FBP">{t('sql.fbp')}</option><option value="PAYROLL">{t('sql.payroll')}</option><option value="BOTH">{t('sql.both')}</option>
              </Select>
            </Field>
          </section>

          <section>
            <p className="mb-2 text-[13px] font-semibold">BANT</p>
            <div className="grid grid-cols-2 gap-3">
              {([['sql.budget', 'budgetId', 'budgetNote', budget.data], ['sql.authority', 'authorityId', 'authorityNote', authority.data],
                ['sql.need', 'needId', 'needNote', need.data], ['sql.timeline', 'timelineId', 'timelineNote', timeline.data]] as const).map(([label, id, note, opts]) => (
                <div key={id} className="space-y-1.5 rounded-2xl border border-line p-3">
                  <Field label={t(label)} required>
                    <Select value={f[id]} onChange={set(id)}>
                      <option value="">{t('sql.select')}</option>
                      {opts?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </Select>
                  </Field>
                  <Input placeholder={t('sql.noteOptional')} value={f[note]} onChange={set(note)} className="h-7 text-xs" />
                </div>
              ))}
            </div>
          </section>

          {c && (!c.canSubmit || override) && (
            <section className={cn('rounded-2xl border p-4', override ? 'border-brand-forest/30 bg-brand-forest-50/70' : 'border-line bg-canvas/50')}>
              <Checkbox checked={override} label="High intent: submit this SQL anyway"
                onChange={(v) => { setOverride(v); setF((cur) => ({ ...cur, intentRating: v ? 'HIGH' : '' })); }} />
              <p className="mt-1 text-xs text-ink-muted">The checklist isn't fully green. If the prospect is clearly keen, you can still pass it, with a reason.</p>
              {override && (
                <Field label="Why is this high intent?" required className="mt-3" hint="e.g. CFO asked for pricing today, payroll vendor contract ends next month">
                  <Textarea rows={3} autoFocus value={f.intentReason} onChange={set('intentReason')} placeholder="What did they say or do that shows real intent?" />
                </Field>
              )}
            </section>
          )}

          {(needsIntent || needsSmall) && (
            <section className="grid grid-cols-2 gap-3 rounded-2xl border border-[#202E64]/25 bg-[#E9EBF3] p-4">
              {needsIntent && <>
                <Field label="Intent rating" hint="P1 cities need HIGH intent + manager confirmation">
                  <Select value={f.intentRating} onChange={set('intentRating')}>
                    <option value="">Select…</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
                  </Select>
                </Field>
                <Field label="Why high intent?"><Input value={f.intentReason} onChange={set('intentReason')} /></Field>
              </>}
              {needsSmall && (
                <Field label="Small account — reason for exception" className="col-span-2" hint="Needs manager approval">
                  <Textarea rows={2} value={f.smallExceptionReason} onChange={set('smallExceptionReason')} />
                </Field>
              )}
            </section>
          )}

        </div>

        <aside className="h-fit rounded-xl border border-line bg-canvas/60 p-3.5 md:sticky md:top-0">
          <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold"><Sparkles className="h-3.5 w-3.5 text-accent" />ICP checklist</p>
          {!f.qualifyingStakeholderId && <p className="text-xs text-ink-muted">Pick the qualifying stakeholder to run the checks.</p>}
          {check.error && <p className="text-xs text-danger">{(check.error as Error).message}</p>}
          <ul className="space-y-2.5">
            {c?.criteria.map((x) => (
              <li key={x.code} className="flex gap-2">
                <CriterionIcon s={x.status} />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{criterionLabel[x.code] ?? humanize(x.code)}</p>
                  {x.detail && <p className="text-2xs text-ink-muted">{x.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
          {c && (
            <div className={cn('mt-4 rounded-lg px-2.5 py-2 text-xs font-medium',
              c.canSubmit ? (c.needsApproval ? 'bg-warning-soft text-[#202E64]' : 'bg-success-soft text-success') : 'bg-black/[0.04] text-ink-muted')}>
              {c.canSubmit ? (c.needsApproval ? 'Ready — goes to your manager for approval' : 'Ready to submit') : overrideOk ? 'Passing on high intent' : <span className="flex items-center gap-1.5"><CircleDashed className="h-3.5 w-3.5" />Not ready yet</span>}
            </div>
          )}
        </aside>
      </div>
      )}
    </Modal>
  );
}

interface SqlDetail {
  id: string; accountId: string; accountName: string; attempt: number; status: string; submittedBy: string; submittedAt?: string;
  licensePotential?: number; sizeBucket?: string; city?: string; locationPriority?: string; businessRelevance?: string;
  intentRating?: string; intentReason?: string; smallException: boolean; smallExceptionReason?: string; connectionType?: string;
  qualifyingStakeholder?: string; qualifyingLevel?: number; referredBy?: string; rejectionReason?: string; rejectionNote?: string;
  criteria: { code: string; passed: boolean | null; detail?: string }[];
}

/** Manager review: approve or reject with a reason, then hand to an AE. */
export function ValidateSqlModal({ open, onClose, submissionId, onApproved }: {
  open: boolean; onClose: () => void; submissionId: string | null; onApproved?: (accountId: string, accountName: string) => void;
}) {
  const reasons = usePicklist('SQL_REJECTION_REASON');
  const { data: d } = useQuery({ queryKey: ['sql', submissionId], queryFn: () => api.get<SqlDetail>(`/api/sql/${submissionId}`), enabled: open && !!submissionId });
  const [mode, setMode] = useState<'approve' | 'reject'>('approve');
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');
  const [confirmIntent, setConfirmIntent] = useState(false);
  const [approveSmall, setApproveSmall] = useState(false);
  useEffect(() => { if (open) { setMode('approve'); setReasonId(''); setNote(''); setConfirmIntent(false); setApproveSmall(false); } }, [open]);

  const needsIntent = d?.locationPriority === 'P1';
  const go = useAction(() => api.post(`/api/sql/${submissionId}/validate`, {
    approve: mode === 'approve', rejectionReasonId: mode === 'reject' ? reasonId : null, note: note || null, confirmIntent, approveSmall,
  }), {
    success: mode === 'approve' ? 'SQL approved' : 'SQL rejected — the BDR has been told why',
    invalidate: [['sql'], ['queue'], ['dashboard'], ['accounts']],
    onSuccess: () => { onClose(); if (mode === 'approve' && d) onApproved?.(d.accountId, d.accountName); },
  });

  const blocked = mode === 'reject' ? !reasonId : (needsIntent && !confirmIntent) || (d?.smallException && !approveSmall);

  return (
    <Modal open={open} onClose={onClose} width="max-w-2xl" title={d ? `Review SQL · ${d.accountName}` : 'Review SQL'}
      subtitle={d ? `Submitted by ${d.submittedBy} · ${fmtDateTime(d.submittedAt)}${d.attempt > 1 ? ` · attempt ${d.attempt}` : ''}` : undefined}
      footer={<><Button onClick={onClose}>Cancel</Button>
        <Button variant={mode === 'approve' ? 'primary' : 'danger'} disabled={!d || !!blocked} loading={go.isPending} onClick={() => go.mutate(undefined)}>
          {mode === 'approve' ? 'Approve SQL' : 'Reject SQL'}
        </Button></>}>
      {!d ? <p className="text-xs text-ink-muted">Loading…</p> : (
        <div className="space-y-5">
          <div className="flex items-center gap-2"><SqlBadge status={d.status as never} />{d.smallException && <Badge tone="warning">Small-account exception</Badge>}</div>
          <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-[13px]">
            {[['Stakeholder', `${d.qualifyingStakeholder ?? '—'}${d.qualifyingLevel ? ` (L${d.qualifyingLevel})` : ''}`],
              ['Referred by', d.referredBy ?? '—'], ['Connection', humanize(d.connectionType)],
              ['City', `${d.city ?? '—'} ${d.locationPriority && d.locationPriority !== 'NONE' ? `· ${d.locationPriority}` : ''}`],
              ['License potential', d.licensePotential ?? '—'], ['Size', humanize(d.sizeBucket)],
              ['Relevance', d.businessRelevance ?? '—'], ['Intent', d.intentRating ? `${humanize(d.intentRating)}${d.intentReason ? ` — ${d.intentReason}` : ''}` : '—'],
            ].map(([k, v]) => <div key={k as string}><dt className="text-2xs text-ink-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}
          </dl>
          {d.smallExceptionReason && <p className="rounded-lg bg-canvas p-2.5 text-xs"><b>Exception reason:</b> {d.smallExceptionReason}</p>}
          <ul className="grid grid-cols-2 gap-2">
            {d.criteria.map((x) => (
              <li key={x.code} className="flex gap-2 rounded-2xl border border-line p-2.5">
                <CriterionIcon s={x.passed === true ? 'PASS' : x.passed === false ? 'FAIL' : 'NEEDS_APPROVAL'} />
                <div><p className="text-xs font-medium">{criterionLabel[x.code] ?? humanize(x.code)}</p>{x.detail && <p className="text-2xs text-ink-muted">{x.detail}</p>}</div>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <Button variant={mode === 'approve' ? 'subtle' : 'ghost'} onClick={() => setMode('approve')}>Approve</Button>
            <Button variant={mode === 'reject' ? 'subtle' : 'ghost'} onClick={() => setMode('reject')}>Reject</Button>
          </div>
          {mode === 'approve' ? (
            <div className="space-y-2">
              {needsIntent && <Checkbox checked={confirmIntent} onChange={setConfirmIntent} label="I confirm the high intent for this P1-city account" />}
              {d.smallException && <Checkbox checked={approveSmall} onChange={setApproveSmall} label="Approve the small-account exception" />}
              <Field label="Note (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reason" required>
                <Select value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
                  <option value="">Select…</option>
                  {reasons.data?.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </Select>
              </Field>
              <Field label="Note for the BDR"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Pick the AE. The least-loaded AE is suggested; overriding it, or reassigning, asks for a reason. */
export function AssignModal({ open, onClose, accountId, accountName, currentAeId }: {
  open: boolean; onClose: () => void; accountId: string | null; accountName?: string; currentAeId?: string | null;
}) {
  const reasons = usePicklist('REASSIGNMENT_REASON');
  const { data } = useQuery({
    queryKey: ['capacity'], queryFn: () => api.get<{ aes: CapacityRow[]; recommended?: { aeId: string } }>('/api/assignment/capacity'), enabled: open,
  });
  const [aeId, setAeId] = useState('');
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { if (open) { setAeId(''); setReasonId(''); setNote(''); } }, [open]);
  useEffect(() => { if (open && data?.recommended && !aeId) setAeId(data.recommended.aeId); }, [open, data, aeId]);

  const recommended = data?.recommended?.aeId;
  const reassigning = !!currentAeId;
  const go = useAction(() => api.post(`/api/accounts/${accountId}/assign`, {
    aeId, method: aeId === recommended ? 'CAPACITY' : 'MANUAL', reasonId: reasonId || null, note: note || null,
  }), { success: 'AE assigned — they’ve been notified', invalidate: [['queue'], ['account'], ['accounts'], ['capacity'], ['sql']], onSuccess: onClose });

  const rows = [...(data?.aes ?? [])].sort((a, b) => a.rank - b.rank);
  const wl = { LOW: 'success', BALANCED: 'neutral', HIGH: 'danger' } as const;

  return (
    <Modal open={open} onClose={onClose} width="max-w-2xl" title={`${reassigning ? 'Reassign' : 'Assign'} AE${accountName ? ` · ${accountName}` : ''}`}
      footer={<><Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!aeId || (reassigning && !reasonId)} loading={go.isPending} onClick={() => go.mutate(undefined)}>Assign</Button></>}>
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-[13px]">
          <thead className="bg-canvas text-2xs uppercase tracking-wide text-ink-muted">
            <tr><th className="px-3 py-2 text-left font-medium">AE</th><th className="px-2 text-right font-medium">Active</th><th className="px-2 text-right font-medium">L1 pending</th>
              <th className="px-2 text-right font-medium">L2/L3</th><th className="px-2 text-right font-medium">Negotiation</th><th className="px-3 text-right font-medium">Load</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.load.aeId} onClick={() => setAeId(r.load.aeId)}
                className={cn('cursor-pointer border-t border-line transition-colors hover:bg-canvas', aeId === r.load.aeId && 'bg-accent-soft/60 hover:bg-accent-soft/60')}>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <input type="radio" readOnly checked={aeId === r.load.aeId} className="accent-accent" />
                    <span className="font-medium">{r.load.name}</span>
                    {r.load.aeId === recommended && <Badge tone="accent">Suggested</Badge>}
                    {r.load.aeId === currentAeId && <Badge>Current</Badge>}
                  </span>
                </td>
                <td className="px-2 text-right tabular-nums">{r.load.activeAccounts}</td>
                <td className="px-2 text-right tabular-nums">{r.load.l1Pending}</td>
                <td className="px-2 text-right tabular-nums">{r.load.l2 + r.load.l3}</td>
                <td className="px-2 text-right tabular-nums">{r.load.negotiation}</td>
                <td className="px-3 text-right"><Badge tone={wl[r.workload]}>{humanize(r.workload)}</Badge></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-ink-muted">No active AEs yet. Add one under Team.</td></tr>}
          </tbody>
        </table>
      </div>
      {(reassigning || (aeId && recommended && aeId !== recommended)) && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Reason" required={reassigning}>
            <Select value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
              <option value="">Select…</option>
              {reasons.data?.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </Field>
          <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
      )}
    </Modal>
  );
}