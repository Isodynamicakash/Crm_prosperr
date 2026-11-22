import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Check, ClipboardList, Gauge, ListChecks, Mail, MapPin, Pencil, Plus, Settings2, SlidersHorizontal, Trash2, UserSquare2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { humanize } from '@/lib/format';
import type { City, Department, PicklistItem } from '@/lib/types';
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, PageHeader, Select, SkeletonRows, Textarea } from '@/components/ui/ui';
import { Modal } from '@/components/ui/overlay';
import { stageLabel } from '@/components/ui/status';

type Section = 'general' | 'picklists' | 'cities' | 'designations' | 'stages' | 'checklists' | 'templates';
const SECTIONS: { key: Section; label: string; icon: typeof Gauge; hint: string }[] = [
  { key: 'general', label: 'General', icon: SlidersHorizontal, hint: 'Windows, limits, digests' }, { key: 'picklists', label: 'Dropdown lists', icon: ClipboardList, hint: 'Outcomes, reasons, sources' },
  { key: 'cities', label: 'Cities & ICP', icon: MapPin, hint: 'Locations and priority' }, { key: 'designations', label: 'Designations', icon: UserSquare2, hint: 'Title → level mapping' },
  { key: 'stages', label: 'Stage thresholds', icon: Gauge, hint: 'When a deal is stuck' }, { key: 'checklists', label: 'Stage requirements', icon: ListChecks, hint: 'Exit criteria per stage' },
  { key: 'templates', label: 'Email templates', icon: Mail, hint: 'Sequences and internal mail' },
];

/** Everything the business tunes without a code change (M10-1). */
export default function SettingsPage() {
  const [s, setS] = useState<Section>('general');
  return (
    <div>
      <PageHeader title="Settings" icon={<Settings2 />} eyebrow="Workspace" subtitle="Everything the business tunes without a code change. Changes apply immediately for the whole team." />
      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        <nav className="space-y-1 lg:sticky lg:top-2 lg:self-start">
          {SECTIONS.map((x) => (
            <button key={x.key} onClick={() => setS(x.key)}
              className={cn('group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all hover:bg-white/80', s === x.key && 'bg-brand-forest text-white shadow-[0_10px_24px_-12px_rgba(5,63,26,.8)] hover:bg-brand-forest')}>
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', s === x.key ? 'bg-brand-mint text-brand-night' : 'bg-white text-brand-forest ring-1 ring-line')}><x.icon className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block text-[13px] font-semibold">{x.label}</span><span className={cn('block truncate text-[11px]', s === x.key ? 'text-white/60' : 'text-ink-muted')}>{x.hint}</span></span>
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {s === 'general' && <General />}
          {s === 'picklists' && <Picklists />}
          {s === 'cities' && <Cities />}
          {s === 'designations' && <Designations />}
          {s === 'stages' && <Stages />}
          {s === 'checklists' && <Checklists />}
          {s === 'templates' && <Templates />}
        </div>
      </div>
    </div>
  );
}

function General() {
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => api.get<{ key: string; value: string; description?: string }[]>('/api/admin/settings') });
  const [edit, setEdit] = useState<{ key: string; value: string } | null>(null);
  const save = useAction((p: { key: string; value: string }) => {
    let parsed: unknown;
    try { parsed = JSON.parse(p.value); } catch { parsed = p.value; }
    return api.put(`/api/admin/settings/${p.key}`, parsed);
  }, { success: 'Setting saved', invalidate: [['settings']], onSuccess: () => setEdit(null) });
  return (
    <Card>
      <CardHeader title="General settings" />
      {isLoading ? <SkeletonRows /> : (
        <ul className="divide-y divide-line p-2">
          {data?.map((r) => (
            <li key={r.key} className="flex items-center gap-4 px-2 py-2.5">
              <div className="min-w-0 flex-1"><p className="text-[13px] font-medium">{humanize(r.key)}</p>{r.description && <p className="text-xs text-ink-muted">{r.description}</p>}</div>
              {edit?.key === r.key ? (
                <div className="flex items-center gap-1.5">
                  <Input className="w-56 font-mono text-xs" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save.mutate(edit)} autoFocus />
                  <Button size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate(edit)}><Check className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" onClick={() => setEdit(null)}>Cancel</Button>
                </div>
              ) : (
                <button onClick={() => setEdit({ key: r.key, value: r.value })} className="group flex max-w-[280px] items-center gap-2 rounded-md px-2 py-1 font-mono text-xs text-ink-soft hover:bg-canvas">
                  <span className="truncate">{r.value}</span><Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const KEYS = ['INDUSTRY', 'LEAD_SOURCE', 'CALL_OUTCOME', 'INACTIVE_REASON', 'REACTIVATION_REASON', 'STAGNATION_REASON', 'LOST_REASON', 'SQL_REJECTION_REASON', 'REASSIGNMENT_REASON', 'BANT_BUDGET', 'BANT_AUTHORITY', 'BANT_NEED', 'BANT_TIMELINE'];

function Picklists() {
  const [key, setKey] = useState('INACTIVE_REASON');
  const { data, isLoading } = useQuery({ queryKey: ['picklist-admin', key], queryFn: () => api.get<PicklistItem[]>(`/api/config/picklists/${key}`) });
  const [edit, setEdit] = useState<Partial<PicklistItem> | null>(null);
  const save = useAction((p: Partial<PicklistItem>) => api.put('/api/admin/picklists', {
    key, code: p.code, label: p.label, sortOrder: p.sortOrder ?? null, active: p.active ?? true, requiresRevisitDate: p.requiresRevisitDate ?? null, requiresRemark: p.requiresRemark ?? null,
  }), { success: 'Saved', invalidate: [['picklist-admin', key], ['picklist', key]], onSuccess: () => setEdit(null) });
  return (
    <Card>
      <CardHeader title="Dropdown lists" subtitle="Values people pick from. Deactivate instead of deleting so history stays readable."
        action={<div className="flex gap-2">
          <Select value={key} onChange={(e) => setKey(e.target.value)} className="w-52">{KEYS.map((k) => <option key={k} value={k}>{humanize(k)}</option>)}</Select>
          {key !== 'CALL_OUTCOME' && <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setEdit({ code: '', label: '', active: true })}>Add</Button>}
        </div>} />
      {isLoading ? <SkeletonRows /> : (
        <ul className="divide-y divide-line p-2">
          {data?.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-2 py-2">
              <span className={cn('flex-1 text-[13px]', !p.active && 'text-ink-muted line-through')}>{p.label}</span>
              <span className="font-mono text-2xs text-ink-muted">{p.code}</span>
              {p.requiresRevisitDate && <Badge>Needs revisit date</Badge>}
              {p.requiresRemark && <Badge>Needs remark</Badge>}
              <Button size="sm" variant="ghost" onClick={() => setEdit(p)}>Edit</Button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit value' : 'Add value'} width="max-w-md"
        footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" disabled={!edit?.label || !edit?.code} loading={save.isPending} onClick={() => edit && save.mutate(edit)}>Save</Button></>}>
        {edit && (
          <div className="space-y-3">
            <Field label="Label" required><Input autoFocus value={edit.label ?? ''} onChange={(e) => setEdit({ ...edit, label: e.target.value, code: edit.id ? edit.code : e.target.value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') })} /></Field>
            <Field label="Code" hint="Stable identifier used in reports"><Input disabled={!!edit.id} value={edit.code ?? ''} onChange={(e) => setEdit({ ...edit, code: e.target.value })} className="font-mono text-xs" /></Field>
            <Field label="Order"><Input type="number" value={edit.sortOrder ?? ''} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} /></Field>
            <div className="flex flex-wrap gap-4">
              <Checkbox checked={edit.active ?? true} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" />
              {key === 'INACTIVE_REASON' && <Checkbox checked={!!edit.requiresRevisitDate} onChange={(v) => setEdit({ ...edit, requiresRevisitDate: v })} label="Needs revisit date" />}
              <Checkbox checked={!!edit.requiresRemark} onChange={(v) => setEdit({ ...edit, requiresRemark: v })} label="Needs remark" />
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

function Cities() {
  const { data, isLoading } = useQuery({ queryKey: ['cities'], queryFn: () => api.get<City[]>('/api/config/cities') });
  const [edit, setEdit] = useState<{ name: string; region: string; icpPriority: string } | null>(null);
  const save = useAction((c: { name: string; region: string; icpPriority: string }) => api.put('/api/admin/cities', { ...c, region: c.region || null, active: true }), {
    success: 'City saved', invalidate: [['cities']], onSuccess: () => setEdit(null),
  });
  return (
    <Card>
      <CardHeader title="Cities & ICP priority" subtitle="P0 cities pass the location check. P1 needs high intent and manager confirmation."
        action={<Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setEdit({ name: '', region: '', icpPriority: 'P1' })}>Add city</Button>} />
      {isLoading ? <SkeletonRows /> : (
        <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-3">
          {data?.map((c) => (
            <button key={c.id} onClick={() => setEdit({ name: c.name, region: c.region ?? '', icpPriority: c.priority })}
              className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-left text-[13px] hover:border-accent/40">
              <span>{c.name}{c.region && <span className="text-ink-muted"> · {c.region}</span>}</span>
              <Badge tone={c.priority === 'P0' ? 'success' : c.priority === 'P1' ? 'warning' : 'neutral'}>{c.priority === 'NONE' ? 'Not ICP' : c.priority}</Badge>
            </button>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="City" width="max-w-sm"
        footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" disabled={!edit?.name} loading={save.isPending} onClick={() => edit && save.mutate(edit)}>Save</Button></>}>
        {edit && (
          <div className="space-y-3">
            <Field label="Name" required><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Region"><Input value={edit.region} onChange={(e) => setEdit({ ...edit, region: e.target.value })} /></Field>
            <Field label="ICP priority"><Select value={edit.icpPriority} onChange={(e) => setEdit({ ...edit, icpPriority: e.target.value })}><option value="P0">P0 — core</option><option value="P1">P1 — conditional</option><option value="NONE">Not ICP</option></Select></Field>
          </div>
        )}
      </Modal>
    </Card>
  );
}

const DEPTS: Department[] = ['FINANCE', 'HR', 'PAYROLL', 'OTHER'];

function Designations() {
  const review = useQuery({ queryKey: ['designations-review'], queryFn: () => api.get<{ designation: string; exampleTitle?: string; stakeholders: number }[]>('/api/admin/designations/review') });
  const map = useQuery({ queryKey: ['designations'], queryFn: () => api.get<{ id: string; designation: string; level: number; department: Department; priorityRank: number; rightPoc: boolean }[]>('/api/config/designations') });
  const [edit, setEdit] = useState<{ designation: string; level: number; department: Department; priorityRank: number; rightPoc: boolean } | null>(null);
  const save = useAction((d: NonNullable<typeof edit>) => api.put('/api/admin/designations', { ...d, rightPocMinBucket: null }), {
    success: 'Mapped — matching stakeholders updated', invalidate: [['designations-review'], ['designations'], ['account']], onSuccess: () => setEdit(null),
  });
  const [q, setQ] = useState('');
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Needs mapping" subtitle="Titles we couldn’t place. Map them once and every matching stakeholder gets a level and department." />
        {(review.data ?? []).length === 0 ? <p className="px-4 pb-4 pt-2 text-xs text-ink-muted">All designations are mapped.</p> : (
          <ul className="divide-y divide-line p-2">
            {review.data!.map((r) => (
              <li key={r.designation} className="flex items-center gap-3 px-2 py-2">
                <span className="flex-1 text-[13px]">{r.exampleTitle ?? r.designation}</span>
                <span className="text-xs text-ink-muted">{r.stakeholders} people</span>
                <Button size="sm" variant="subtle" onClick={() => setEdit({ designation: r.exampleTitle ?? r.designation, level: 3, department: 'FINANCE', priorityRank: 5, rightPoc: false })}>Map</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <CardHeader title={`Designation map · ${map.data?.length ?? 0}`} action={<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="h-7 w-48 text-xs" />} />
        <div className="max-h-[420px] overflow-y-auto p-2 scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-2xs uppercase tracking-wide text-ink-muted"><th className="px-2 py-1.5 font-medium">Designation</th><th className="px-2 font-medium">Level</th><th className="px-2 font-medium">Department</th><th className="px-2 font-medium">Priority</th><th className="px-2 font-medium">Right POC</th></tr></thead>
            <tbody>
              {map.data?.filter((d) => d.designation.toLowerCase().includes(q.toLowerCase())).map((d) => (
                <tr key={d.id} onClick={() => setEdit({ designation: d.designation, level: d.level, department: d.department, priorityRank: d.priorityRank, rightPoc: d.rightPoc })} className="cursor-pointer border-t border-line/70 hover:bg-canvas">
                  <td className="px-2 py-1.5">{d.designation}</td><td className="px-2">L{d.level}</td><td className="px-2">{humanize(d.department)}</td><td className="px-2">{d.priorityRank}</td><td className="px-2">{d.rightPoc ? 'Yes' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Map designation" width="max-w-md"
        footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={save.isPending} onClick={() => edit && save.mutate(edit)}>Save</Button></>}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Designation" className="col-span-2"><Input value={edit.designation} onChange={(e) => setEdit({ ...edit, designation: e.target.value })} /></Field>
            <Field label="Level" hint="1 = most senior"><Select value={edit.level} onChange={(e) => setEdit({ ...edit, level: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>L{l}</option>)}</Select></Field>
            <Field label="Department"><Select value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value as Department })}>{DEPTS.map((d) => <option key={d} value={d}>{humanize(d)}</option>)}</Select></Field>
            <Field label="Calling priority" hint="Lower is called first"><Input type="number" min={1} value={edit.priorityRank} onChange={(e) => setEdit({ ...edit, priorityRank: Number(e.target.value) })} /></Field>
            <div className="flex items-end pb-1"><Checkbox checked={edit.rightPoc} onChange={(v) => setEdit({ ...edit, rightPoc: v })} label="Right POC" /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Stages() {
  const { data } = useQuery({ queryKey: ['thresholds'], queryFn: () => api.get<{ stage: keyof typeof stageLabel; inactivityFlagDays: number; stagnationDays?: number; followUpIntervalDays: number }[]>('/api/admin/stage-thresholds') });
  const [rows, setRows] = useState(data ?? []);
  useEffect(() => { if (data) setRows(data); }, [data]);
  const save = useAction(async () => {
    const changed = rows.filter((r) => JSON.stringify(r) !== JSON.stringify(data?.find((d) => d.stage === r.stage)));
    for (const r of changed) await api.put(`/api/admin/stage-thresholds/${r.stage}`, { inactivityFlagDays: r.inactivityFlagDays, stagnationDays: r.stagnationDays ?? null, followUpIntervalDays: r.followUpIntervalDays });
    return changed.length;
  }, { success: (n) => (n ? `${n} stage${n > 1 ? 's' : ''} updated` : 'Nothing changed'), invalidate: [['thresholds']] });
  return (
    <Card>
      <CardHeader title="Stage thresholds" subtitle="When accounts get flagged for inactivity, and when a stage counts as stuck."
        action={<Button size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button>} />
      <div className="p-2">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-2xs uppercase tracking-wide text-ink-muted"><th className="px-2 py-2 font-medium">Stage</th><th className="px-2 font-medium">Flag after (days idle)</th><th className="px-2 font-medium">Stuck after (days)</th><th className="px-2 font-medium">Follow-up every (days)</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.stage} className="border-t border-line/70">
                <td className="px-2 py-1.5 font-medium">{stageLabel[r.stage] ?? r.stage}</td>
                {(['inactivityFlagDays', 'stagnationDays', 'followUpIntervalDays'] as const).map((k) => (
                  <td key={k} className="px-2 py-1"><Input type="number" min={0} className="h-7 w-24" value={r[k] ?? ''} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value === '' ? undefined : Number(e.target.value) } : x)))} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface ChecklistItem { id: string; stage: string; code: string; label: string; sortOrder: number; exitStep: boolean; requiresAttachment: boolean }
const CHECKLIST_STAGES = ['L1', 'L2', 'L3'] as const;

/** What the AE must do in each stage (M6-9). "Needed to move on" items gate the automatic stage move. */
function Checklists() {
  const { data, isLoading } = useQuery({ queryKey: ['checklist-items'], queryFn: () => api.get<ChecklistItem[]>('/api/config/checklist-items') });
  const [stage, setStage] = useState<string>('L1');
  const [edit, setEdit] = useState<ChecklistItem | null>(null);
  const items = (data ?? []).filter((i) => i.stage === stage).sort((a, b) => a.sortOrder - b.sortOrder);
  const invalidate = [['checklist-items'], ['opportunity']];
  const upsert = useAction((i: ChecklistItem & { active?: boolean }) => api.put('/api/admin/checklist-items', {
    stage: i.stage, code: i.code, label: i.label.trim(), sortOrder: i.sortOrder, exitStep: i.exitStep, requiresAttachment: i.requiresAttachment, active: i.active ?? true,
  }), { invalidate });
  const swap = useAction(async ([a, b]: [ChecklistItem, ChecklistItem]) => {
    await api.put('/api/admin/checklist-items', { ...a, sortOrder: b.sortOrder, active: true });
    await api.put('/api/admin/checklist-items', { ...b, sortOrder: a.sortOrder, active: true });
  }, { invalidate });
  const newItem = (): ChecklistItem => ({ id: '', stage, code: '', label: '', sortOrder: (items.at(-1)?.sortOrder ?? 0) + 1, exitStep: false, requiresAttachment: false });

  return (
    <Card>
      <CardHeader title="Stage requirements" subtitle="The checklist AEs work through at each stage. Items marked “needed to move on” must be ticked before the next meeting can advance the deal."
        action={<Button size="sm" variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setEdit(newItem())}>Add item</Button>} />
      <div className="px-4 pt-3">
        <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5">
          {CHECKLIST_STAGES.map((st) => (
            <button key={st} onClick={() => setStage(st)} className={cn('h-7 rounded-md px-3 text-xs font-medium text-ink-muted', stage === st && 'bg-white text-ink shadow-card')}>
              {st} · {(data ?? []).filter((i) => i.stage === st).length}
            </button>
          ))}
        </div>
      </div>
      <div className="p-2">
        {isLoading ? <SkeletonRows rows={4} /> : items.length === 0 ? <p className="px-2 py-6 text-center text-xs text-ink-muted">No items for {stage} yet.</p> : (
          <ul className="divide-y divide-line/70">
            {items.map((it, i) => (
              <li key={it.id} className="group flex items-center gap-2 px-2 py-2">
                <span className="w-5 text-center text-2xs tabular-nums text-ink-muted">{i + 1}</span>
                <p className="flex-1 text-[13px]">{it.label}</p>
                {it.exitStep && <Badge tone="warning">Needed to move on</Badge>}
                {it.requiresAttachment && <Badge>Needs file/link</Badge>}
                <div className="flex opacity-60 group-hover:opacity-100">
                  <Button size="icon" variant="ghost" disabled={i === 0 || swap.isPending} onClick={() => swap.mutate([it, items[i - 1]])}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" disabled={i === items.length - 1 || swap.isPending} onClick={() => swap.mutate([it, items[i + 1]])}><ArrowDown className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEdit(it)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Remove "${it.label}" from ${stage}? Deals already ticked keep their history.`)) upsert.mutate({ ...it, active: false }, { onSuccess: () => toast.success('Item removed') }); }}>
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ChecklistItemModal item={edit} onClose={() => setEdit(null)} saving={upsert.isPending}
        onSave={(it) => upsert.mutate(it, { onSuccess: () => { toast.success(it.id ? 'Item updated' : 'Item added'); setEdit(null); } })} />
    </Card>
  );
}

function ChecklistItemModal({ item, onClose, onSave, saving }: { item: ChecklistItem | null; onClose: () => void; onSave: (i: ChecklistItem) => void; saving: boolean }) {
  const [f, setF] = useState<ChecklistItem | null>(item);
  useEffect(() => setF(item), [item]);
  if (!f) return null;
  const code = f.code || f.label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  return (
    <Modal open={!!item} onClose={onClose} title={f.id ? 'Edit requirement' : `New ${f.stage} requirement`} width="max-w-md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!f.label.trim() || !code} loading={saving} onClick={() => onSave({ ...f, code })}>Save</Button></>}>
      <div className="space-y-3">
        <Field label="What has to be done" required><Input autoFocus value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="e.g. Security questionnaire answered" /></Field>
        <Field label="Stage">
          <Select value={f.stage} disabled={!!f.id} onChange={(e) => setF({ ...f, stage: e.target.value })}>{CHECKLIST_STAGES.map((st) => <option key={st}>{st}</option>)}</Select>
        </Field>
        <Checkbox checked={f.exitStep} onChange={(v) => setF({ ...f, exitStep: v })} label="Needed to move to the next stage" />
        <Checkbox checked={f.requiresAttachment} onChange={(v) => setF({ ...f, requiresAttachment: v })} label="AE must attach a file or link when ticking" />
      </div>
    </Modal>
  );
}

interface Template { id: string; code: string; name: string; subject: string; body: string; internal: boolean; active: boolean; version: number }

function Templates() {
  const { data } = useQuery({ queryKey: ['templates'], queryFn: () => api.get<Template[]>('/api/admin/email-templates') });
  const [edit, setEdit] = useState<Template | null>(null);
  const save = useAction((t: Template) => api.put(`/api/admin/email-templates/${t.code}`, { name: t.name, subject: t.subject, body: t.body, active: t.active }), {
    success: 'Template saved — new emails use it from now on', invalidate: [['templates']], onSuccess: () => setEdit(null),
  });
  return (
    <Card>
      <CardHeader title="Email templates" subtitle="Merge fields like {{First Name}} and {{Company}} fill in automatically." />
      <ul className="divide-y divide-line p-2">
        {data?.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-2 py-2.5">
            <div className="min-w-0 flex-1"><p className="text-[13px] font-medium">{t.name}</p><p className="truncate text-xs text-ink-muted">{t.subject}</p></div>
            {t.internal && <Badge>Internal</Badge>}{!t.active && <Badge tone="danger">Off</Badge>}
            <Button size="sm" variant="ghost" onClick={() => setEdit(t)}>Edit</Button>
          </li>
        ))}
      </ul>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.name ?? ''} width="max-w-3xl"
        footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={save.isPending} onClick={() => { if (!edit?.subject.trim()) { toast.error('Subject is required'); return; } save.mutate(edit); }}>Save template</Button></>}>
        {edit && (
          <div className="space-y-3">
            <Field label="Subject"><Input value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></Field>
            <Field label="Body"><Textarea rows={14} className="font-mono text-xs" value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
            <Checkbox checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" />
          </div>
        )}
      </Modal>
    </Card>
  );
}
