import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, Mail, Pause, Play, Send, Square } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAction } from '@/lib/hooks';
import { Badge, Button } from '@/components/ui/ui';
import { Modal } from '@/components/ui/overlay';
import { GoogleConnect } from '@/features/integrations/Google';

export interface Enrollment { id?: string; status?: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'STOPPED'; step?: number; lastSentAt?: string; nextSendAt?: string; stopReason?: string }
interface PreviewStep { step: number; dayOffset: number; sendAt: string; sameThread: boolean; toBdr: boolean; to: string | null; subject: string; body: string }
interface Preview { sequenceId: string; stakeholder: string; account: string; email: string | null; doNotContact: boolean; mailbox: string | null; mailboxConnected: boolean; running: boolean; steps: PreviewStep[] }

export const STOP_LABEL: Record<string, string> = {
  REPLY: 'Replied', BOUNCE: 'Bounced', OPT_OUT: 'Unsubscribed', L1_BOOKED: 'L1 booked', COMPLETED: 'No reply', MANUAL: 'Stopped', DNC: 'Do not contact',
};

const when = (iso?: string) => iso ? new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

/** Small status pill for a person's latest sequence. */
export function SequenceStatus({ e, compact }: { e?: Enrollment; compact?: boolean }) {
  if (!e?.status) return null;
  if (e.status === 'RUNNING') return <Badge tone="success" dot>{compact ? `Email ${e.step}` : `Sequence · step ${e.step}${e.nextSendAt ? ` · next ${when(e.nextSendAt)}` : ''}`}</Badge>;
  if (e.status === 'PAUSED') return <Badge tone="warning">Sequence paused</Badge>;
  const label = STOP_LABEL[e.stopReason ?? ''] ?? humanStop(e.stopReason);
  return <Badge tone={e.stopReason === 'REPLY' || e.stopReason === 'L1_BOOKED' ? 'success' : 'neutral'}>{label}</Badge>;
}
const humanStop = (s?: string) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : 'Ended');

/** Button on a stakeholder row: shows the sequence state and opens the preview / controls. */
export function SequenceButton({ stakeholderId, accountId, hasEmail }: { stakeholderId: string; accountId: string; hasEmail: boolean }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['sequence', stakeholderId], queryFn: () => api.get<Enrollment>(`/api/stakeholders/${stakeholderId}/sequence`), enabled: hasEmail });
  if (!hasEmail) return null;
  const e = q.data;
  const live = e?.status === 'RUNNING' || e?.status === 'PAUSED';
  return (
    <>
      <Button size="sm" variant={live ? 'subtle' : 'ghost'} icon={<Send className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}
        title={live ? 'Email sequence running' : 'Start an email sequence'}>
        {live ? (e?.status === 'PAUSED' ? 'Paused' : `Email ${e?.step}/3`) : 'Sequence'}
      </Button>
      {open && <SequenceModal open onClose={() => setOpen(false)} stakeholderId={stakeholderId} accountId={accountId} enrollment={e} />}
    </>
  );
}

/** Preview every email (rendered for this person, with send dates), then start; or pause / resume / stop a running one. */
export function SequenceModal({ open, onClose, stakeholderId, accountId, enrollment }: {
  open: boolean; onClose: () => void; stakeholderId: string; accountId: string; enrollment?: Enrollment;
}) {
  const p = useQuery({ queryKey: ['sequence', stakeholderId, 'preview'], queryFn: () => api.get<Preview>(`/api/stakeholders/${stakeholderId}/sequence/preview`), enabled: open });
  const [openStep, setOpenStep] = useState<number | null>(1);
  const invalidate = [['sequence', stakeholderId], ['account', accountId], ['sequences']];
  const start = useAction(() => api.post<{ result: string; warning?: string }[]>('/api/sequences/start', { stakeholderIds: [stakeholderId], startedFromCall: false }), {
    success: (r) => r[0]?.result === 'ENROLLED' ? (r[0].warning ? `Sequence started. Note: ${r[0].warning}` : 'Sequence started') : null,
    invalidate, onSuccess: (r) => { if (r[0]?.result === 'ENROLLED') onClose(); },
  });
  const skipped = start.data?.[0]?.result === 'SKIPPED' ? start.data[0].warning : null;
  const pause = useAction(async (v: boolean) => { await api.post(`/api/sequences/enrollments/${enrollment?.id}/pause?pause=${v}`); return v; }, { success: (v) => v ? 'Sequence paused' : 'Sequence resumed', invalidate, onSuccess: onClose });
  const stop = useAction(() => api.post(`/api/sequences/enrollments/${enrollment?.id}/stop`), { success: 'Sequence stopped', invalidate, onSuccess: onClose });
  const d = p.data;
  const live = enrollment?.status === 'RUNNING' || enrollment?.status === 'PAUSED';
  const blocker = !d ? null : d.doNotContact ? 'This person asked not to be contacted.' : !d.email ? 'No valid email for this person. Add one first.'
    : !d.mailboxConnected ? 'connect' : null;

  return (
    <Modal open={open} onClose={onClose} width="max-w-2xl" title={live ? 'Email sequence' : 'Start email sequence'}
      subtitle={d ? `${d.stakeholder} · ${d.account}${d.email ? ` · ${d.email}` : ''}` : undefined}
      footer={live ? (
        <>
          <Button variant="ghost" icon={<Square className="h-3.5 w-3.5" />} loading={stop.isPending} onClick={() => stop.mutate(undefined)}>Stop</Button>
          {enrollment?.status === 'RUNNING'
            ? <Button icon={<Pause className="h-3.5 w-3.5" />} loading={pause.isPending} onClick={() => pause.mutate(true)}>Pause</Button>
            : <Button variant="primary" icon={<Play className="h-3.5 w-3.5" />} loading={pause.isPending} onClick={() => pause.mutate(false)}>Resume</Button>}
        </>
      ) : (
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<Send className="h-3.5 w-3.5" />} disabled={!d || !!blocker} loading={start.isPending} onClick={() => start.mutate(undefined)}>Start sequence</Button>
        </>
      )}>
      {p.isLoading && <p className="py-8 text-center text-sm text-ink-muted">Preparing the emails…</p>}
      {p.isError && (
        <div className="flex items-start gap-2.5 rounded-xl bg-canvas px-3 py-3 text-[13px]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy" />
          <div><p className="font-semibold">Can’t prepare these emails</p><p className="mt-0.5 text-ink-soft">{(p.error as Error).message}</p></div>
        </div>
      )}
      {d && (
        <div className="space-y-3">
          {live && <div className="rounded-xl bg-brand-forest-50 px-3 py-2 text-[13px] text-brand-forest">
            {enrollment?.status === 'PAUSED' ? 'Paused. Resume to continue from where it stopped.' : <>Running · email {enrollment?.step} of 3{enrollment?.nextSendAt && <> · next goes {when(enrollment.nextSendAt)}</>}</>}
          </div>}
          {!live && blocker === 'connect' && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-canvas/70 p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-brand-navy" />
              <p className="min-w-0 flex-1 text-[13px]">Emails go from <b>your own Gmail</b>. Connect Google once, then come back here.</p>
              <div className="w-56"><GoogleConnect dark={false} /></div>
            </div>
          )}
          {!live && blocker && blocker !== 'connect' && <p className="rounded-xl bg-canvas px-3 py-2 text-[13px] text-brand-navy">{blocker}</p>}
          {skipped && <p className="rounded-xl bg-canvas px-3 py-2 text-[13px] text-brand-navy">Not started: {skipped}</p>}
          {!live && !blocker && (
            <p className="text-[13px] text-ink-soft">
              Sent from <b>{d.mailbox}</b> on working days, 9:30 to 6:30. It stops by itself if they reply, the email bounces, they unsubscribe, or an L1 gets booked at {d.account}.
            </p>
          )}
          <ol className="relative space-y-2 border-l-2 border-brand-forest/15 pl-4">
            {d.steps.map((s) => {
              const done = live && (enrollment?.step ?? 1) > s.step;
              const isOpen = openStep === s.step;
              return (
                <li key={s.step} className="relative">
                  <span className={cn('absolute -left-[23px] top-3 grid h-3.5 w-3.5 place-items-center rounded-full border-2 border-white',
                    done ? 'bg-brand-mint' : s.toBdr ? 'bg-brand-navy/60' : 'bg-brand-forest')} />
                  <button type="button" onClick={() => setOpenStep(isOpen ? null : s.step)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line/80 bg-white px-3 py-2.5 text-left hover:border-brand-forest/30">
                    <Mail className={cn('h-4 w-4 shrink-0', s.toBdr ? 'text-brand-navy' : 'text-brand-forest')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{s.toBdr ? 'Reminder to you: call them' : s.sameThread ? `Re: ${d.steps[0]?.subject}` : s.subject}</span>
                      <span className="block text-[11px] text-ink-muted">
                        Day {s.dayOffset} · {live ? `email ${s.step}` : when(s.sendAt)}{s.sameThread && ' · same thread'}{done && ' · sent'}
                      </span>
                    </span>
                    <ChevronDown className={cn('h-4 w-4 text-ink-muted transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="mt-1.5 rounded-xl bg-canvas/70 p-3">
                      <p className="text-[11px] text-ink-muted">To: {s.to ?? '—'}</p>
                      <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-ink">{s.body}</pre>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="text-[11px] text-ink-muted">Wording comes from the email templates your manager keeps in Settings. Every email carries an unsubscribe link.</p>
        </div>
      )}
    </Modal>
  );
}
