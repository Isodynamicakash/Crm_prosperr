import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Check, CheckSquare, Clock, ListTodo, Mail, Pencil, Phone, Plus, RotateCw, Search, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { isLeadership, useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { useUsers } from '@/lib/queries';
import { cn } from '@/lib/cn';
import { celebrate } from '@/lib/celebrate';
import { addDaysISO, fmtDateTime, humanize, todayISO } from '@/lib/format';
import type { AccountRow, Page, TaskRow, TaskType } from '@/lib/types';
import { RadialGauge } from '@/components/charts/kit';
import { AnimatedNumber, Button, Card, Empty, Field, Input, PageHeader, Segmented, Select, SkeletonRows } from '@/components/ui/ui';
import { Modal } from '@/components/ui/overlay';

type Bucket = 'Overdue' | 'Today' | 'Upcoming';

/** Open tasks grouped by urgency. One click completes; click a task to edit its text, type or date; snooze moves to tomorrow. */
export default function TasksPage() {
  const { user } = useAuth();
  const leader = isLeadership(user?.role);
  const users = useUsers(leader);
  const [who, setWho] = useState('');
  const [status, setStatus] = useState<'OPEN' | 'DONE'>('OPEN');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['tasks', who, status], queryFn: () => api.get<TaskRow[]>('/api/tasks', { assigneeId: who || undefined, status }),
  });
  const doneCount = useQuery({ queryKey: ['tasks', who, 'DONE'], queryFn: () => api.get<TaskRow[]>('/api/tasks', { assigneeId: who || undefined, status: 'DONE' }), enabled: status === 'OPEN' });
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
      <PageHeader title="Tasks" icon={<CheckSquare />} eyebrow="Follow-ups" subtitle={status === 'OPEN' ? 'Created automatically from calls and meetings. Tick them off as you go.' : 'Completed tasks'}
        stats={status === 'OPEN' ? [
          { label: 'Overdue', value: <AnimatedNumber value={left(groups.Overdue)} />, hint: 'Do these first' },
          { label: 'Due today', value: <AnimatedNumber value={left(groups.Today)} />, hint: 'On today’s plate' },
          { label: 'Upcoming', value: <AnimatedNumber value={left(groups.Upcoming)} />, hint: 'Later this week and beyond' },
        ] : undefined}
        actions={<>
          {leader && (
            <Select value={who} onChange={(e) => setWho(e.target.value)} className="w-44">
              <option value="">My tasks</option>{users.data?.filter((u) => u.active && u.id !== user?.id).map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </Select>
          )}
          <Segmented value={status} onChange={setStatus} options={[{ value: 'OPEN', label: 'Open' }, { value: 'DONE', label: 'Done' }]} />
          <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAdding(true)}>New task</Button>
        </>} />
      {status === 'OPEN' && !!data?.length && <TaskInsights rows={data} done={doneCount.data?.length ?? 0} overdue={left(groups.Overdue)} today={left(groups.Today)} />}
      {isLoading ? <Card><SkeletonRows /></Card> : !data?.length ? (
        <Card><Empty icon={<CheckSquare className="h-5 w-5" />} title={status === 'OPEN' ? 'No open tasks' : 'Nothing completed yet'} body="Tasks are created automatically from call outcomes and meetings." /></Card>
      ) : (
        <div className="space-y-5">
          {(['Overdue', 'Today', 'Upcoming'] as Bucket[]).filter((b) => groups[b].length).map((b) => (
            <section key={b}>
              {status === 'OPEN' && (
                <div className="mb-2.5 flex items-center gap-2.5 px-1">
                  <span className={cn('h-2.5 w-2.5 rounded-full', b === 'Overdue' ? 'bg-brand-navy shadow-[0_0_0_4px_rgba(32,46,100,.15)]' : b === 'Today' ? 'bg-brand-mint shadow-[0_0_0_4px_rgba(35,178,74,.2)]' : 'bg-brand-forest/40')} />
                  <p className="font-display text-[17px] font-medium tracking-[-0.02em]">{b}</p>
                  <span className="rounded-full bg-brand-forest-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-brand-forest">{left(groups[b])}</span>
                  <span className="hidden text-[12px] text-brand-forest/60 sm:inline">{b === 'Overdue' ? 'Do these first' : b === 'Today' ? 'On today’s plate' : 'Coming up'}</span>
                </div>
              )}
              <ul className="space-y-2">
                {groups[b].map((t) => {
                  const I = typeIcon[t.type] ?? ListTodo;
                  const late = b === 'Overdue' && status === 'OPEN';
                  return (
                    <li key={t.id} className={cn('group relative flex items-center gap-3 overflow-hidden rounded-[18px] border border-line/70 bg-white py-3 pl-4 pr-3 transition-all hover:border-brand-forest/25 hover:shadow-[0_14px_30px_-22px_rgba(5,63,26,.7)] sm:pr-4', finished.has(t.id) && 'animate-[row-out_300ms_ease-in_600ms_forwards]')}>
                      <span className={cn('absolute inset-y-0 left-0 w-[3px]', late ? 'bg-brand-navy' : b === 'Today' ? 'bg-brand-mint' : 'bg-brand-forest/25')} />
                      {status === 'OPEN' ? (
                        <TaskCheck state={finished.has(t.id) ? 'done' : complete.isPending && complete.variables?.id === t.id ? 'saving' : 'open'} onClick={() => complete.mutate(t)} />
                      ) : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-forest text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>}
                      <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-forest-50 text-brand-forest sm:flex"><I className="h-4 w-4" /></span>
                      <div className={cn('min-w-0 flex-1', status === 'OPEN' && 'cursor-pointer')} onClick={(e) => { if (status === 'OPEN' && !(e.target as HTMLElement).closest('a')) setEditing(t); }}>
                        <p className="text-[13.5px] font-semibold leading-snug"><span className={cn(status === 'DONE' && 'text-ink-muted line-through', finished.has(t.id) && 'strike-through text-ink-muted transition-colors')}>{t.title}</span></p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-brand-forest/70">
                          <Link to={`/accounts/${t.accountId}${t.stakeholderId ? `?stakeholder=${t.stakeholderId}` : ''}`} className="font-medium text-brand-forest hover:underline">{t.accountName}</Link>
                          {t.stakeholderName && <span>· {t.stakeholderName}</span>}
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-forest-50 px-2 py-0.5 text-[10.5px] font-semibold text-brand-forest sm:hidden"><I className="h-3 w-3" />{humanize(t.type)}</span>
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums sm:hidden', late ? 'bg-brand-navy/10 text-brand-navy' : 'bg-canvas text-ink-soft')}><Clock className="h-3 w-3" />{fmtDateTime(t.dueAt)}</span>
                        </p>
                      </div>
                      <span className="hidden items-center gap-1.5 rounded-full bg-brand-forest-50 px-2.5 py-1 text-[11px] font-semibold text-brand-forest lg:inline-flex">{humanize(t.type)}</span>
                      <span className={cn('hidden w-36 items-center justify-end gap-1.5 text-right text-[12px] font-medium tabular-nums sm:flex', late ? 'text-brand-navy' : 'text-brand-forest/70')}>{late && <span className="rounded-full bg-brand-navy/10 px-1.5 text-[10px] font-bold uppercase tracking-wide">Late</span>}{fmtDateTime(t.dueAt)}</span>
                      {status === 'OPEN' && (
                        <>
                          <button onClick={() => snooze.mutate(t)} title="Move to tomorrow 10 AM" className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 text-[11.5px] font-semibold text-brand-forest transition-all hover:border-brand-forest/30 hover:bg-brand-forest-50">
                            <Clock className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tomorrow</span>
                          </button>
                          <button onClick={() => setEditing(t)} title="Edit text, type or date" className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 text-[11.5px] font-semibold text-brand-forest transition-all hover:border-brand-forest/30 hover:bg-brand-forest-50">
                            <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Edit</span>
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <NewTaskModal open={adding} onClose={() => setAdding(false)} />
      <EditTaskModal task={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/** Completion ring, type mix and a 7-day load strip, all from the task lists already loaded. */
function TaskInsights({ rows, done, overdue, today }: { rows: TaskRow[]; done: number; overdue: number; today: number }) {
  const total = rows.length + done;
  const types = Object.entries(rows.reduce<Record<string, number>>((m, t) => ({ ...m, [t.type]: (m[t.type] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...types.map(([, v]) => v));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDaysISO(i);
    return { d, n: rows.filter((t) => new Date(t.dueAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === d).length };
  });
  const dmax = Math.max(1, ...days.map((x) => x.n));
  return (
    <div className="mb-5 grid gap-3 md:grid-cols-3">
      <div className="relative flex items-center gap-4 overflow-hidden rounded-[22px] bg-[#141614] p-4 text-paper">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-mint/20 blur-2xl" />
        <RadialGauge size={92} value={total ? (100 * done) / total : 0} label="" />
        <div className="relative">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-mint">Completion</p>
          <p className="mt-1 font-display text-[26px] font-medium leading-none tabular-nums">{done}<span className="text-paper/40"> / {total}</span></p>
          <p className="mt-1.5 text-[12px] text-paper/60">{overdue ? `${overdue} overdue · ${today} today` : today ? `${today} left for today` : 'Nothing urgent'}</p>
        </div>
      </div>
      <div className="rounded-[22px] border border-line/80 bg-white p-4">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-forest/70">Open by type</p>
        <div className="mt-3 space-y-2">
          {types.slice(0, 4).map(([k, v]) => {
            const I = typeIcon[k] ?? ListTodo;
            return (
              <div key={k} className="flex items-center gap-2.5 text-[12px]">
                <I className="h-3.5 w-3.5 shrink-0 text-brand-forest" /><span className="w-24 shrink-0 truncate font-medium">{humanize(k)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-brand-forest-50"><span className="block h-full rounded-full bg-gradient-to-r from-brand-forest to-brand-mint transition-[width] duration-700" style={{ width: `${(100 * v) / max}%` }} /></span>
                <span className="w-5 text-right font-semibold tabular-nums">{v}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-[22px] border border-line/80 bg-white p-4">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-forest/70">Next 7 days</p>
        <div className="mt-3 flex h-[86px] items-end gap-1.5">
          {days.map((x, i) => (
            <div key={x.d} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-semibold tabular-nums text-brand-forest">{x.n || ''}</span>
              <span className={cn('w-full rounded-t-lg', i === 0 ? 'bg-brand-mint' : 'bg-brand-forest')} style={{ height: `${Math.max(4, (56 * x.n) / dmax)}px`, opacity: x.n ? 1 : 0.15 }} />
              <span className="text-[10px] font-medium text-ink-muted">{i === 0 ? 'Today' : new Date(`${x.d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TYPES: TaskType[] = ['CALL', 'FOLLOW_UP', 'SEND_TEMPLATE', 'MULTITHREAD', 'OTHER'];
const typeIcon: Partial<Record<string, typeof Phone>> = { CALL: Phone, FOLLOW_UP: RotateCw, SEND_TEMPLATE: Mail, MULTITHREAD: Users };

function NewTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [account, setAccount] = useState<AccountRow | null>(null);
  const accountId = account?.id ?? '';
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('FOLLOW_UP');
  const [due, setDue] = useState('');
  useEffect(() => { if (open) { setAccount(null); setTitle(''); setType('FOLLOW_UP'); setDue(`${addDaysISO(1)}T10:00`); } }, [open]);
  const save = useAction(() => api.post('/api/tasks', { accountId, stakeholderId: null, type, title, dueAt: new Date(due).toISOString(), assigneeId: null }), {
    success: 'Task added', invalidate: [['tasks'], ['my-day']], onSuccess: onClose,
  });
  return (
    <Modal open={open} onClose={onClose} title="New task"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!accountId || !title.trim() || !due} loading={save.isPending} onClick={() => save.mutate(undefined)}>Add task</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="What needs doing" required className="col-span-2"><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Send FBP deck to the CFO" /></Field>
        <Field label="Account" required className="col-span-2">
          <AccountPicker value={account} onChange={setAccount} />
        </Field>
        <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value as TaskType)}>{TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</Select></Field>
        <Field label="Due" required><Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/** ISO time → the value a datetime-local input wants, in the browser's own time zone (same as saving). */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}

/** Edit an open task: what needs doing, its type, and when it's due. */
function EditTaskModal({ task, onClose }: { task: TaskRow | null; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('FOLLOW_UP');
  const [due, setDue] = useState('');
  useEffect(() => { if (task) { setTitle(task.title); setType(task.type); setDue(toLocalInput(task.dueAt)); } }, [task]);
  const types = task && !TYPES.includes(task.type) ? [task.type, ...TYPES] : TYPES;
  const at = (days: number, hh = 10) => `${addDaysISO(days)}T${String(hh).padStart(2, '0')}:00`;
  const save = useAction(() => api.patch(`/api/tasks/${task!.id}`, { title: title.trim(), type, dueAt: new Date(due).toISOString(), assigneeId: null }), {
    success: 'Task updated', invalidate: [['tasks'], ['my-day'], ['dashboard']], onSuccess: onClose,
  });
  const changed = !!task && (title.trim() !== task.title || type !== task.type || due !== toLocalInput(task.dueAt));
  return (
    <Modal open={!!task} onClose={onClose} title="Edit task" subtitle={task ? [task.accountName, task.stakeholderName].filter(Boolean).join(' · ') : undefined}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!title.trim() || !due || !changed} loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="What needs doing" required className="col-span-2"><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value as TaskType)}>{types.map((x) => <option key={x} value={x}>{humanize(x)}</option>)}</Select></Field>
        <Field label="Due" required><Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <div className="col-span-2 flex flex-wrap gap-1.5">
          {([['Today 5 PM', at(0, 17)], ['Tomorrow 10 AM', at(1)], ['In 3 days', at(3)], ['Next week', at(7)]] as const).map(([label, v]) => (
            <Button key={label} size="sm" variant="ghost" onClick={() => setDue(v)}>{label}</Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/** One box: type to search your accounts, pick from the list; the choice shows as a chip you can clear. */
function AccountPicker({ value, onChange }: { value: AccountRow | null; onChange: (a: AccountRow | null) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const list = useQuery({ queryKey: ['accounts', 'pick', q], queryFn: () => api.get<Page<AccountRow>>('/api/accounts', { q, status: 'ALL', size: 20 }), enabled: open });
  const items = list.data?.items ?? [];
  useEffect(() => { setHi(0); }, [q]);
  const pick = (a: AccountRow) => { onChange(a); setOpen(false); setQ(''); };

  if (value) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-xl border border-brand-forest/30 bg-brand-forest-50/60 pl-3 pr-1.5">
        <Check className="h-3.5 w-3.5 shrink-0 text-brand-forest" strokeWidth={3} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{value.name}
          {value.city && <span className="font-normal text-ink-muted"> · {value.city}</span>}</span>
        <button type="button" onClick={() => onChange(null)} className="h-7 rounded-lg px-2 text-xs font-semibold text-brand-forest hover:bg-white">Change</button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
      <Input placeholder="Type a company name…" value={q} className="pl-9" role="combobox" aria-expanded={open} aria-autocomplete="list"
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, items.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter' && items[hi]) { e.preventDefault(); pick(items[hi]); }
          else if (e.key === 'Escape') setOpen(false);
        }} />
      {open && (
        <ul role="listbox" className="absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-[0_12px_32px_-12px_rgba(5,63,26,.35)]">
          {list.isLoading && <li className="px-3 py-2 text-xs text-ink-muted">Searching…</li>}
          {!list.isLoading && items.length === 0 && <li className="px-3 py-2 text-xs text-ink-muted">No account matches “{q}”.</li>}
          {items.map((a, i) => (
            <li key={a.id} role="option" aria-selected={i === hi}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setHi(i)} onClick={() => pick(a)}
                className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px]', i === hi && 'bg-brand-forest-50')}>
                <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
                <span className="shrink-0 text-[11px] text-ink-muted">{[a.city, humanize(a.stage)].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Checkbox that only turns green once the server has confirmed the task is done. */
function TaskCheck({ state, onClick }: { state: 'open' | 'saving' | 'done'; onClick: () => void }) {
  if (state === 'done') {
    return <span className="flex h-6 w-6 shrink-0 animate-check-pop items-center justify-center rounded-full bg-brand-mint text-brand-night" aria-label="Done"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>;
  }
  return (
    <button onClick={onClick} disabled={state === 'saving'} title="Mark done" aria-label="Mark done"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-brand-forest/25 text-transparent transition-all hover:border-brand-mint hover:bg-brand-mint/10 hover:text-brand-forest disabled:border-brand-mint/40">
      {state === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-forest" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </button>
  );
}