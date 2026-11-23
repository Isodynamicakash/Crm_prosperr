import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, Lightbulb, Link2, Trophy, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { usePicklist } from '@/lib/queries';
import { cn } from '@/lib/cn';
import { celebrate } from '@/lib/celebrate';
import { fmtDate, relTime } from '@/lib/format';
import type { LifecycleStage, Temperature } from '@/lib/types';
import { Modal } from '@/components/ui/overlay';
import { Button, Card, CardHeader, Field, Input, Segmented, Select, Textarea } from '@/components/ui/ui';
import { stageLabel } from '@/components/ui/status';

/** Manual moves the backend allows; every other stage change happens when a meeting outcome is recorded. */
export const MANUAL_MOVES: Partial<Record<LifecycleStage, LifecycleStage[]>> = {
  SQL: ['LOST'], L1: ['MULTITHREADING', 'LOST'], MULTITHREADING: ['LOST'], L2: ['LOST'],
  L3: ['NEGOTIATION', 'WON', 'LOST'], NEGOTIATION: ['WON', 'LOST'], WON: ['IMPLEMENTATION'],
};

interface Opp {
  id: string; accountId: string; stage: LifecycleStage; stageEnteredAt?: string; temperature?: Temperature; expectedMrr?: number;
  licenseCount?: number; stagnationReasonId?: string; stagnationNote?: string; nextStep?: string; nextStepDue?: string;
  expectedCloseDate?: string; version: number;
}
interface ChecklistRow { id: string; stage: string; code: string; label: string; exitStep: boolean; requiresAttachment: boolean; done: boolean; doneAt?: string; doneBy?: string; note?: string }
interface OppDetail { opportunity: Opp; stagnationReasonRequired: boolean; checklist: ChecklistRow[]; blockedBy?: string | null; temperatureHistory: { from?: string; to: string; changedAt: string; changedBy: string }[] }

export function OpportunityPanel({ opportunityId, canEdit }: { opportunityId: string; canEdit: boolean }) {
  const { data } = useQuery({ queryKey: ['opportunity', opportunityId], queryFn: () => api.get<OppDetail>(`/api/opportunities/${opportunityId}`) });
  const stagnation = usePicklist('STAGNATION_REASON');
  const [f, setF] = useState<Partial<Opp>>({});
  const [move, setMove] = useState<LifecycleStage | null>(null);
  const [attachFor, setAttachFor] = useState<ChecklistRow | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const o = data?.opportunity;
  // Live sync refreshes this card; keep the user's unsaved edits instead of resetting them to the server copy.
  // If someone else changed the deal meanwhile, the version check on save catches it.
  const base = useRef<Partial<Opp> | null>(null);
  useEffect(() => {
    if (!o) return;
    // Read and move the "last server copy" outside the state updater: React may run an updater twice (StrictMode),
    // and a ref changed inside it made the second run think the form was being edited, leaving it blank.
    const prev = base.current;
    base.current = o;
    setF((cur) => (prev && JSON.stringify(pick(cur)) !== JSON.stringify(pick(prev)) ? cur : o));
  }, [o]);
  const unsaved = !!o && canEdit && JSON.stringify(pick(f)) !== JSON.stringify(pick(o));
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const save = useAction(() => api.patch(`/api/opportunities/${opportunityId}`, {
    temperature: f.temperature ?? null, expectedMrr: f.expectedMrr ?? null, licenseCount: f.licenseCount ?? null,
    stagnationReasonId: f.stagnationReasonId ?? null, stagnationNote: f.stagnationNote ?? null, nextStep: f.nextStep ?? null,
    nextStepDue: f.nextStepDue ?? null, expectedCloseDate: f.expectedCloseDate ?? null, version: o?.version,
  }), { success: 'Opportunity saved', invalidate: [['opportunity', opportunityId], ['account'], ['accounts']] });

  const tick = useAction((p: { item: ChecklistRow; done: boolean; attachmentId?: string }) =>
    api.put(`/api/opportunities/${opportunityId}/checklist/${p.item.id}`, { done: p.done, note: null, attachmentId: p.attachmentId ?? null }),
  { invalidate: [['opportunity', opportunityId], ['account']] });

  if (!data || !o) return <Card className="p-4 text-xs text-ink-muted">Loading opportunity…</Card>;
  const dirty = JSON.stringify(pick(f)) !== JSON.stringify(pick(o));
  const checklistStages = Array.from(new Set(data.checklist.map((c) => c.stage)));
  const defaultTab = CHECKLIST_FOR[o.stage] ?? checklistStages[0];
  const activeTab = tab && checklistStages.includes(tab) ? tab : defaultTab;
  const stageItems = data.checklist.filter((c) => c.stage === activeTab);
  const guide = NEXT_STEP[o.stage];
  const moves = MANUAL_MOVES[o.stage] ?? [];

  return (
    <Card>
      <CardHeader title="Opportunity" subtitle={`In ${stageLabel[o.stage]} for ${relTime(o.stageEnteredAt).replace(' ago', '')}`}
        action={canEdit && moves.length > 0 && (
          <div className="flex gap-1.5">
            {moves.map((m) => (
              <Button key={m} size="sm" variant={m === 'WON' ? 'primary' : m === 'LOST' ? 'ghost' : 'secondary'} onClick={() => setMove(m)}
                icon={m === 'WON' ? <Trophy className="h-3.5 w-3.5" /> : m === 'LOST' ? <XCircle className="h-3.5 w-3.5" /> : undefined}>
                {m === 'LOST' ? 'Mark lost' : stageLabel[m]}
              </Button>
            ))}
          </div>
        )} />
      <div className="space-y-4 p-4">
        {data.blockedBy && <p className="flex items-center gap-2.5 rounded-2xl border border-[#202E64]/25 bg-[#E9EBF3] px-4 py-3 text-[12.5px] text-[#202E64]"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#202E64] text-white"><AlertTriangle className="h-3.5 w-3.5" /></span>{data.blockedBy}</p>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Field label="Temperature">
            <div className="flex gap-1">
              {(['HOT', 'WARM', 'COLD'] as const).map((t) => (
                <button key={t} disabled={!canEdit} onClick={() => setF({ ...f, temperature: t })}
                  className={cn('h-9 flex-1 rounded-full border text-xs font-semibold transition-all',
                    f.temperature === t ? (t === 'HOT' ? 'border-brand-forest bg-brand-forest text-white shadow-[0_6px_14px_-8px_rgba(5,63,26,.9)]' : t === 'WARM' ? 'border-brand-mint bg-[#E6F5EA] text-[#1A7F36]' : 'border-brand-navy/40 bg-brand-navy-50 text-brand-navy') : 'border-line text-ink-muted hover:border-brand-forest/30')}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Expected MRR (₹)"><Input type="number" disabled={!canEdit} value={f.expectedMrr ?? ''} onChange={(e) => setF({ ...f, expectedMrr: e.target.value ? Number(e.target.value) : undefined })} /></Field>
          <Field label="Licenses"><Input type="number" disabled={!canEdit} value={f.licenseCount ?? ''} onChange={(e) => setF({ ...f, licenseCount: e.target.value ? Number(e.target.value) : undefined })} /></Field>
          <Field label="Expected close"><Input type="date" disabled={!canEdit} value={f.expectedCloseDate ?? ''} onChange={(e) => setF({ ...f, expectedCloseDate: e.target.value || undefined })} /></Field>
          <Field label="Next step" className="col-span-2 lg:col-span-3"><Input disabled={!canEdit} value={f.nextStep ?? ''} onChange={(e) => setF({ ...f, nextStep: e.target.value })} /></Field>
          <Field label="Next step due"><Input type="date" disabled={!canEdit} value={f.nextStepDue ?? ''} onChange={(e) => setF({ ...f, nextStepDue: e.target.value || undefined })} /></Field>
          {data.stagnationReasonRequired && (
            <>
              <Field label="Why is it stuck?" required className="col-span-2">
                <Select disabled={!canEdit} value={f.stagnationReasonId ?? ''} onChange={(e) => setF({ ...f, stagnationReasonId: e.target.value || undefined })}>
                  <option value="">Select…</option>{stagnation.data?.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </Select>
              </Field>
              <Field label="Note" className="col-span-2"><Input disabled={!canEdit} value={f.stagnationNote ?? ''} onChange={(e) => setF({ ...f, stagnationNote: e.target.value })} /></Field>
            </>
          )}
        </div>
        {canEdit && dirty && (
          <div className="flex items-center justify-end gap-2 rounded-xl bg-brand-forest-50 px-3 py-2 ring-1 ring-brand-forest/20"><span className="mr-auto flex items-center gap-1.5 text-xs font-semibold text-brand-forest"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-mint" />Unsaved changes</span><Button size="sm" onClick={() => setF(o)}>Discard</Button><Button size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate(undefined)}>Save changes</Button></div>
        )}

        <Journey stage={o.stage} />
        {guide && (
          <p className="flex gap-3 rounded-2xl bg-[#141614] px-4 py-3.5 text-[12.5px] leading-relaxed text-paper/80">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-mint text-brand-night"><Lightbulb className="h-3.5 w-3.5" /></span><span><b className="text-paper">What moves this forward:</b> {guide}</span>
          </p>
        )}

        {checklistStages.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] font-medium">Stage requirements</p>
                <div className="mt-1.5 flex items-center gap-2"><div className="h-1.5 w-40 overflow-hidden rounded-full bg-black/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-brand-forest to-brand-mint transition-[width] duration-700" style={{ width: `${stageItems.length ? (100 * stageItems.filter((c) => c.done).length) / stageItems.length : 0}%` }} /></div>
                  <span className="text-[11px] text-ink-muted">{stageItems.filter((c) => c.done).length} of {stageItems.length} done</span></div>
              </div>
              <Segmented value={activeTab} onChange={setTab}
                options={checklistStages.map((st) => {
                  const items = data.checklist.filter((c) => c.stage === st);
                  return { value: st, label: `${st} · ${items.filter((c) => c.done).length}/${items.length}` };
                })} />
            </div>
            <ul className="space-y-1.5">
              {stageItems.map((c) => (
                <li key={c.id}>
                  <button disabled={!canEdit || tick.isPending}
                    onClick={() => (c.done ? tick.mutate({ item: c, done: false }) : c.requiresAttachment ? setAttachFor(c) : tick.mutate({ item: c, done: true }))}
                    className={cn('group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all disabled:cursor-default', c.done ? 'border-brand-mint/30 bg-[#E6F5EA]/60' : 'border-line/70 bg-white hover:border-brand-forest/30')}>
                    <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors', c.done ? 'border-brand-mint bg-brand-mint text-white' : 'border-line group-hover:border-brand-forest')}>
                      {c.done && <Check className="h-3 w-3" />}
                    </span>
                    <span className={cn('flex-1 text-[13px] font-medium', c.done && 'text-ink-muted line-through')}>{c.label}</span>
                    {c.exitStep && <span className="rounded-full bg-brand-forest px-2 py-0.5 text-2xs font-semibold text-white">Needed to move on</span>}
                    {c.requiresAttachment && !c.done && <span title="Needs a file or link"><Link2 className="h-3.5 w-3.5 text-ink-muted" /></span>}
                    {c.done && <span className="text-2xs text-ink-muted">{c.doneBy} · {fmtDate(c.doneAt)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.temperatureHistory.length > 0 && (
          <p className="text-2xs text-ink-muted">Temperature: {data.temperatureHistory.slice(0, 3).map((t) => `${t.to.toLowerCase()} (${fmtDate(t.changedAt)})`).join(' ← ')}</p>
        )}
      </div>
      <StageMoveModal open={!!move} target={move} onClose={() => setMove(null)} opportunityId={opportunityId} />
      <AttachModal item={attachFor} onClose={() => setAttachFor(null)} accountId={o.accountId} opportunityId={opportunityId}
        onAttached={(attachmentId) => { if (attachFor) tick.mutate({ item: attachFor, done: true, attachmentId }); setAttachFor(null); }} />
    </Card>
  );
}

const JOURNEY: LifecycleStage[] = ['SQL', 'L1', 'L2', 'L3', 'NEGOTIATION', 'WON'];
const CHECKLIST_FOR: Partial<Record<LifecycleStage, string>> = { SQL: 'L1', L1: 'L1', MULTITHREADING: 'L1', L2: 'L2', L3: 'L3', NEGOTIATION: 'L3' };
const NEXT_STEP: Partial<Record<LifecycleStage, string>> = {
  SQL: 'Hold the L1 meeting, then click Record outcome on it and choose a "Done" option. The deal moves to L1 done on its own.',
  L1: 'Work through the L1 list and tick "All documents shared" (attach the link). Book the L2 meeting; when it is recorded as Done, the deal moves to L2. Use Multithreading if you need more stakeholders first.',
  MULTITHREADING: 'Get the missing functions engaged, tick "All documents shared", then book L2. Recording L2 as Done moves the deal to L2.',
  L2: 'Tick "Commercials sent" (attach the proposal), book L3, and record it as Done to move to L3.',
  L3: 'Finish the L3 list, then use Negotiation or Won at the top of this card.',
  NEGOTIATION: 'Close it: mark Won or Lost at the top of this card.',
  WON: 'Hand over: move to Implementation when onboarding starts.',
};

function Journey({ stage }: { stage: LifecycleStage }) {
  const at = stage === 'MULTITHREADING' ? 1 : JOURNEY.indexOf(stage);
  if (at < 0) return null;
  return (
    <ol className="flex items-center gap-1">
      {JOURNEY.map((st, i) => (
        <li key={st} className="flex flex-1 items-center gap-1">
          <span className={cn('flex h-8 flex-1 items-center justify-center rounded-full text-[11px] font-semibold transition-all',
            i < at ? 'bg-[#E6F5EA] text-[#1A7F36]' : i === at ? 'bg-brand-forest text-white shadow-[0_0_0_3px_rgba(35,178,74,.25)]' : 'bg-canvas text-ink-muted')}>
            {i < at && <Check className="mr-1 h-3 w-3" />}{st === 'L1' && stage === 'MULTITHREADING' ? 'Multithreading' : stageLabel[st]}
          </span>
        </li>
      ))}
    </ol>
  );
}

const pick = (o: Partial<Opp>) => ({ t: o.temperature, m: o.expectedMrr, l: o.licenseCount, s: o.stagnationReasonId, sn: o.stagnationNote ?? '', n: o.nextStep ?? '', d: o.nextStepDue, c: o.expectedCloseDate });

export function StageMoveModal({ open, target, onClose, opportunityId }: { open: boolean; target: LifecycleStage | null; onClose: () => void; opportunityId: string }) {
  const reasons = usePicklist('LOST_REASON');
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { if (open) { setReasonId(''); setNote(''); } }, [open]);
  const go = useAction(() => api.post(`/api/opportunities/${opportunityId}/stage`, { target, lostReasonId: reasonId || null, note: note || null }), {
    success: () => (target === 'WON' ? 'Deal won 🎉' : `Moved to ${target ? stageLabel[target] : ''}`),
    invalidate: [['opportunity', opportunityId], ['account'], ['accounts'], ['dashboard']],
    onSuccess: () => { if (target === 'WON') void celebrate(); onClose(); },
  });
  const lost = target === 'LOST';
  return (
    <Modal open={open} onClose={onClose} title={lost ? 'Mark as lost' : `Move to ${target ? stageLabel[target] : ''}`} width="max-w-md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant={lost ? 'danger' : 'primary'} disabled={lost && !reasonId} loading={go.isPending} onClick={() => go.mutate(undefined)}>Confirm</Button></>}>
      <div className="space-y-3">
        {lost && (
          <Field label="Lost reason" required>
            <Select value={reasonId} onChange={(e) => setReasonId(e.target.value)}><option value="">Select…</option>{reasons.data?.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</Select>
          </Field>
        )}
        <Field label="Note"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function AttachModal({ item, onClose, accountId, opportunityId, onAttached }: {
  item: ChecklistRow | null; onClose: () => void; accountId: string; opportunityId: string; onAttached: (id: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  useEffect(() => { setUrl(''); setName(''); }, [item]);
  const save = useAction(() => api.post<{ id: string }>(`/api/accounts/${accountId}/attachments`, {
    opportunityId, meetingId: null, kind: item?.stage === 'L2' ? 'COMMERCIAL' : 'DOCUMENTS_SHARED',
    fileName: name || url, storagePath: null, externalUrl: url, mimeType: null, sizeBytes: null,
  }), { onSuccess: (r) => onAttached(r.id) });
  return (
    <Modal open={!!item} onClose={onClose} title={item?.label ?? ''} subtitle="Attach the document link to complete this step." width="max-w-md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!url.trim()} loading={save.isPending} onClick={() => { if (!/^https?:\/\//.test(url)) { toast.error('Paste a full link starting with https://'); return; } save.mutate(undefined); }}>Attach &amp; complete</Button></>}>
      <div className="space-y-3">
        <Field label="Link" required hint="Google Drive, Docs or any shareable URL"><Input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field>
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Proposal v2.pdf" /></Field>
      </div>
    </Modal>
  );
}
