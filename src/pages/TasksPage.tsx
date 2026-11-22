import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Check, CheckSquare, Clock, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { isLeadership, useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { useUsers } from '@/lib/queries';
import { cn } from '@/lib/cn';
import { celebrate } from '@/lib/celebrate';
import { addDaysISO, fmtDateTime, humanize, todayISO } from '@/lib/format';
import type { AccountRow, Page, TaskRow, TaskType } from '@/lib/types';
import { AnimatedNumber, Badge, Button, Card, Empty, Field, Input, PageHeader, Segmented, Select, SkeletonRows } from '@/components/ui/ui';
import { Modal } from '@/components/ui/overlay';

type Bucket = 'Overdue' | 'Today' | 'Upcoming';

/** Open tasks grouped by urgency. One click completes; snooze moves to tomorrow. */
export default function TasksPage() {
  const { user } = useAuth();
  const leader = isLeadership(user?.role);
  const users = useUsers(leader);
  const [who, setWho] = useState('');
  const [status, setStatus] = useState<'OPEN' | 'DONE'>('OPEN');
  const [adding, setAdding] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['tasks', who, status], queryFn: () => api.get<TaskRow[]>('/api/tasks', { assigneeId: who || undefined, status }),
  });
  const qc = useQueryClient();
  // Rows the backend has confirmed as done: they play the finish animation, then the list refreshes.
  const [finished, setFinished] = useState<Set<string>>(new Set());
  const pendingDue = useRef(0);
  const complete = useMutation({
    mutationFn: (t: TaskRow) => api.post(`/api/tasks/${t.id}/complete`),
    onSuccess: (_r, t) => {
      setFinished((f) => new Set(f).add(t.id));
      const urgent = [...groups.Overdue, ...groups.Today];
      const wasUrgent = urgent.some((x) => x.id === t.id);
      const urgentLeft = urgent.filter((x) => x.id !== t.id && !finished.has(x.id)).length;
      if (wasUrgent && urgentLeft === 0) { toast.success('All caught up for today 🎉'); void celebrate(); } else toast.success(`Done: ${t.title}`);
      pendingDue.current += 1;
      window.setTimeout(() => {
        pendingDue.current -= 1;
        if (pendingDue.current === 0) {
          ['tasks', 'my-day', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
        }
      }, 900);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  useEffect(() => { setFinished(new Set()); }, [data]);
  const snooze = useAction((t: TaskRow) => api.patch(`/api/tasks/${t.id}`, { dueAt: new Date(addDaysISO(1) + 'T10:00:00+05:30').toISOString(), assigneeId: null }), {
    success: 'Moved to tomorrow 10 AM', invalidate: [['tasks'], ['my-day']],
  });

  const groups = useMemo(() => {
    const today = todayISO();
    const g: Record<Bucket, TaskRow[]> = { Overdue: [], Today: [], Upcoming: [] };
    (data ?? []).forEach((t) => {
      const d = new Date(t.dueAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      (d < today ? g.Overdue : d === today ? g.Today : g.Upcoming).push(t);
    });
    return g;
  }, [data]);

  const left = (rows: TaskRow[]) => rows.filter((t) => !finished.has(t.id)).length;

  return (
    <div>
      <PageHeader title="Tasks" subtitle={status === 'OPEN' ? (
          <span><AnimatedNumber value={left(groups.Overdue)} /> overdue · <AnimatedNumber value={left(groups.Today)} /> today · <AnimatedNumber value={left(groups.Upcoming)} /> upcoming</span>
        ) : 'Completed tasks'}
        actions={<>
          {leader && (
            <Select value={who} onChange={(e) => setWho(e.target.value)} className="w-44">
              <option value="">My tasks</option>{users.data?.filter((u) => u.active && u.id !== user?.id).map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </Select>
          )}
          <Segmented value={status} onChange={setStatus} options={[{ value: 'OPEN', label: 'Open' }, { value: 'DONE', label: 'Done' }]} />
          <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAdding(true)}>New task</Button>
        </>} />
      {isLoading ? <Card><SkeletonRows /></Card> : !data?.length ? (
        <Card><Empty icon={<CheckSquare className="h-5 w-5" />} title={status === 'OPEN' ? 'No open tasks' : 'Nothing completed yet'} body="Tasks are created automatically from call outcomes and meetings." /></Card>
      ) : (
        <div className="space-y-4">
          {(status === 'OPEN' ? (['Overdue', 'Today', 'Upcoming'] as Bucket[]) : (['Overdue', 'Today', 'Upcoming'] as Bucket[])).filter((b) => groups[b].length).map((b) => (
            <Card key={b}>
              <p className={cn('px-4 pb-1 pt-3 text-xs font-semibold', b === 'Overdue' && status === 'OPEN' ? 'text-danger' : 'text-ink-soft')}>{status === 'OPEN' ? b : ''} <span className="font-normal text-ink-muted">{groups[b].length}</span></p>
              <ul className="divide-y divide-line">
                {groups[b].map((t) => (
                  <li key={t.id} className={cn('group flex items-center gap-3 px-4 py-2.5 hover:bg-canvas', finished.has(t.id) && 'animate-[row-out_300ms_ease-in_600ms_forwards]')}>
                    {status === 'OPEN' ? (
                      <TaskCheck state={finished.has(t.id) ? 'done' : complete.isPending && complete.variables?.id === t.id ? 'saving' : 'open'}
                        onClick={() => complete.mutate(t)} />
                    ) : <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-success text-white"><Check className="h-3 w-3" strokeWidth={3} /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium"><span className={cn(status === 'DONE' && 'text-ink-muted line-through', finished.has(t.id) && 'strike-through text-ink-muted transition-colors')}>{t.title}</span></p>
                      <p className="truncate text-xs text-ink-muted">
                        <Link to={`/accounts/${t.accountId}${t.stakeholderId ? `?stakeholder=${t.stakeholderId}` : ''}`} className="hover:text-accent hover:underline">{t.accountName}</Link>
                        {t.stakeholderName && ` · ${t.stakeholderName}`}
                      </p>
                    </div>
                    <Badge>{humanize(t.type)}</Badge>
                    <span className={cn('w-36 text-right text-xs tabular-nums', b === 'Overdue' && status === 'OPEN' ? 'text-danger' : 'text-ink-muted')}>{fmtDateTime(t.dueAt)}</span>
                    {status === 'OPEN' && <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100" icon={<Clock className="h-3.5 w-3.5" />} onClick={() => snooze.mutate(t)}>Tomorrow</Button>}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
      <NewTaskModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

const TYPES: TaskType[] = ['CALL', 'FOLLOW_UP', 'SEND_TEMPLATE', 'MULTITHREAD', 'OTHER'];

function NewTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [accountId, setAccountId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('FOLLOW_UP');
  const [due, setDue] = useState('');
  useEffect(() => { if (open) { setQ(''); setAccountId(''); setTitle(''); setType('FOLLOW_UP'); setDue(`${addDaysISO(1)}T10:00`); } }, [open]);
  const accounts = useQuery({ queryKey: ['accounts', 'pick', q], queryFn: () => api.get<Page<AccountRow>>('/api/accounts', { q, status: 'ALL', size: 20 }), enabled: open });
  const save = useAction(() => api.post('/api/tasks', { accountId, stakeholderId: null, type, title, dueAt: new Date(due).toISOString(), assigneeId: null }), {
    success: 'Task added', invalidate: [['tasks'], ['my-day']], onSuccess: onClose,
  });
  return (
    <Modal open={open} onClose={onClose} title="New task"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!accountId || !title.trim() || !due} loading={save.isPending} onClick={() => save.mutate(undefined)}>Add task</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="What needs doing" required className="col-span-2"><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Send FBP deck to the CFO" /></Field>
        <Field label="Account" required className="col-span-2">
          <div className="space-y-1.5">
            <Input placeholder="Search account…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Select…</option>{accounts.data?.items.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </div>
        </Field>
        <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value as TaskType)}>{TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</Select></Field>
        <Field label="Due" required><Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/** Checkbox that only turns green once the server has confirmed the task is done. */
function TaskCheck({ state, onClick }: { state: 'open' | 'saving' | 'done'; onClick: () => void }) {
  if (state === 'done') {
    return <span className="flex h-[18px] w-[18px] shrink-0 animate-check-pop items-center justify-center rounded-full bg-success text-white" aria-label="Done"><Check className="h-3 w-3" strokeWidth={3} /></span>;
  }
  return (
    <button onClick={onClick} disabled={state === 'saving'} title="Mark done" aria-label="Mark done"
      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-line text-transparent transition-all hover:border-success hover:text-success disabled:border-success/40">
      {state === 'saving' ? <Loader2 className="h-3 w-3 animate-spin text-success" /> : <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  );
}
