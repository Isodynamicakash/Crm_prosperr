import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Check, ClipboardList, Gauge, ListChecks, Mail, MapPin, Pencil, Plus, Settings2, SlidersHorizontal, Trash2, UserSquare2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { humanize } from '@/lib/format';
import type { City, Department, PicklistItem } from '@/lib/types';
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, PageHeader, SectionHead, Select, SkeletonRows, Switch, Tabs, Textarea } from '@/components/ui/ui';
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

function settingValue(raw: string): unknown { try { return JSON.parse(raw); } catch { return raw; } }

function ValueView({ v }: { v: unknown }) {
  if (typeof v === 'number') return <span className="font-display text-[30px] font-medium leading-none tracking-[-0.04em] tabular-nums">{v}</span>;
  if (Array.isArray(v)) return <span className="flex flex-wrap gap-1.5">{v.map((x, i) => <span key={i} className="rounded-full bg-brand-forest-50 px-2.5 py-1 text-[12px] font-medium text-brand-forest">{String(x)}</span>)}</span>;
  if (v && typeof v === 'object') return (
    <span className="flex flex-wrap gap-1.5">
      {Object.entries(v as Record<string, unknown>).map(([k, x]) => (
        <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[12px]">
          <span className="text-ink-muted">{humanize(/[a-z]/.test(k) ? k.replace(/([A-Z])/g, '_$1') : k)}</span>
          <b className="font-semibold text-ink">{Array.isArray(x) ? x.join(', ') : String(x)}</b>
        </span>
      ))}
    </span>
  );
  return <span className="break-all rounded-xl bg-brand-forest-50 px-3 py-1.5 text-[13px] font-medium text-brand-forest">{String(v)}</span>;
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
    <div>
      <SectionHead icon={<SlidersHorizontal />} title="General" subtitle="Working windows, limits and switches that shape how the CRM behaves for everyone." />
      {isLoading ? <Card><SkeletonRows /></Card> : (
        <div className="grid gap-3 xl:grid-cols-2">
          {data?.map((r) => {
            const v = settingValue(r.value);
            const bool = typeof v === 'boolean';
            return (
              <div key={r.key} className="group flex flex-col rounded-[22px] border border-line/80 bg-white p-5 transition-all hover:border-brand-forest/25 hover:shadow-[0_18px_36px_-26px_rgba(5,63,26,.6)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-[15.5px] font-medium tracking-[-0.01em]">{humanize(r.key)}</p>
                    {r.description && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{r.description}</p>}
                  </div>
                  {bool ? <Switch checked={v as boolean} disabled={save.isPending} label={humanize(r.key)} onChange={(nv) => save.mutate({ key: r.key, value: String(nv) })} />
                    : edit?.key !== r.key && <Button size="sm" variant="ghost" className="opacity-60 group-hover:opacity-100" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit({ key: r.key, value: r.value })}>Edit</Button>}
                </div>
                {!bool && (
                  <div className="mt-4">
                    {edit?.key === r.key ? (
                      <div className="space-y-2">
                        <Textarea rows={typeof v === 'object' ? 3 : 1} className="font-mono text-xs" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} autoFocus />
                        <div className="flex gap-2"><Button size="sm" variant="primary" icon={<Check className="h-3.5 w-3.5" />} loading={save.isPending} onClick={() => save.mutate(edit)}>Save</Button><Button size="sm" onClick={() => setEdit(null)}>Cancel</Button></div>
                      </div>
                    ) : <ValueView v={v} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
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
  const active = (data ?? []).filter((p) => p.active).length;
  return (
    <div>
      <SectionHead icon={<ClipboardList />} title="Dropdown lists" subtitle="Values people pick from. Deactivate instead of deleting so history stays readable."
        actions={key !== 'CALL_OUTCOME' && <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setEdit({ code: '', label: '', active: true })}>Add value</Button>} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {KEYS.map((k) => (
          <button key={k} onClick={() => setKey(k)} className={cn('rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-all',
            key === k ? 'border-brand-forest bg-brand-forest text-white shadow-[0_8px_18px_-10px_rgba(5,63,26,.9)]' : 'border-line bg-white text-ink-soft hover:border-brand-forest/30 hover:text-brand-forest')}>{humanize(k)}</button>
        ))}
      </div>
      <Card className="p-2">
        <div className="flex items-center justify-between px-3 pb-2 pt-3">
          <p className="font-display text-[16px] font-medium">{humanize(key)}</p>
          <span className="text-[12px] text-ink-muted">{active} active · {(data?.length ?? 0) - active} off</span>
        </div>
        {isLoading ? <SkeletonRows /> : (
          <ul className="grid gap-1.5 p-1 sm:grid-cols-2">
            {data?.map((p, i) => (
              <li key={p.id} className={cn('group flex items-center gap-3 rounded-[16px] border px-3.5 py-3 transition-all', p.active ? 'border-line/70 bg-white hover:border-brand-forest/25' : 'border-dashed border-line bg-canvas/60')}>
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums', p.active ? 'bg-brand-forest-50 text-brand-forest' : 'bg-black/5 text-ink-muted')}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-[13.5px] font-semibold', !p.active && 'text-ink-muted line-through')}>{p.label}</p>
                  <p className="truncate font-mono text-[10.5px] text-ink-muted">{p.code}</p>
                </div>
                {p.requiresRevisitDate && <Badge tone="accent">Revisit date</Badge>}
                {p.requiresRemark && <Badge tone="accent">Remark</Badge>}
                <Button size="icon" variant="ghost" className="opacity-50 group-hover:opacity-100" onClick={() => setEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
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
    </div>
  );
}

const PRIO = [
  { key: 'P0', label: 'P0 · Core', hint: 'Pass the location check', dot: 'bg-brand-forest', band: 'from-brand-forest to-[#0E5A2A]' },
  { key: 'P1', label: 'P1 · Conditional', hint: 'Need high intent and manager confirmation', dot: 'bg-brand-mint', band: 'from-brand-mint to-[#7CCB8E]' },
  { key: 'NONE', label: 'Not ICP', hint: 'Fail the location check', dot: 'bg-slate-400', band: 'from-slate-400 to-slate-300' },
];

function Cities() {
  const { data, isLoading } = useQuery({ queryKey: ['cities'], queryFn: () => api.get<City[]>('/api/config/cities') });
  const [edit, setEdit] = useState<{ name: string; region: string; icpPriority: string } | null>(null);
  const save = useAction((c: { name: string; region: string; icpPriority: string }) => api.put('/api/admin/cities', { ...c, region: c.region || null, active: true }), {
    success: 'City saved', invalidate: [['cities']], onSuccess: () => setEdit(null),
  });
  return (
    <div>
      <SectionHead icon={<MapPin />} title="Cities & ICP" subtitle="Where the ideal customer is. Priority decides how the SQL location check treats each city."
        actions={<Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setEdit({ name: '', region: '', icpPriority: 'P1' })}>Add city</Button>} />
      {isLoading ? <Card><SkeletonRows /></Card> : (
        <div className="space-y-4">
          {PRIO.map((p) => {
            const list = (data ?? []).filter((c) => c.priority === p.key);
            if (!list.length && p.key === 'NONE') return null;
            return (
              <div key={p.key}>
                <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><span className={cn('h-2.5 w-2.5 rounded-full', p.dot)} />{p.label}<span className="font-normal text-ink-muted">· {list.length} · {p.hint}</span></p>
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
                  {list.map((c) => (
                    <button key={c.id} onClick={() => setEdit({ name: c.name, region: c.region ?? '', icpPriority: c.priority })}
                      className="group relative overflow-hidden rounded-[18px] border border-line/80 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-forest/25 hover:shadow-[0_16px_32px_-22px_rgba(5,63,26,.6)]">
                      <span className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', p.band)} />
                      <MapPin className="h-4 w-4 text-brand-forest" />
                      <p className="mt-2 font-display text-[16px] font-medium tracking-[-0.01em]">{c.name}</p>
                      <p className="text-[12px] text-ink-muted">{c.region || '—'}</p>
                      <Pencil className="absolute right-3 top-3.5 h-3.5 w-3.5 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                  {!list.length && <p className="col-span-full rounded-2xl border border-dashed border-line px-4 py-5 text-center text-xs text-ink-muted">No cities here yet.</p>}
                </div>
              </div>
            );
          })}
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
    </div>
  );
}

const DEPTS: Department[] = ['FINANCE', 'HR', 'PAYROLL', 'OTHER'];
const LEVEL_PILL: Record<number, string> = { 1: 'bg-brand-forest text-white', 2: 'bg-[#0E5A2A] text-white', 3: 'bg-brand-mint text-brand-night', 4: 'bg-[#CDEBD5] text-brand-forest', 5: 'bg-black/[0.06] text-ink-soft' };

function Designations() {
  const review = useQuery({ queryKey: ['designations-review'], queryFn: () => api.get<{ designation: string; exampleTitle?: string; stakeholders: number }[]>('/api/admin/designations/review') });
  const map = useQuery({ queryKey: ['designations'], queryFn: () => api.get<{ id: string; designation: string; level: number; department: Department; priorityRank: number; rightPoc: boolean }[]>('/api/config/designations') });
  const [edit, setEdit] = useState<{ designation: string; level: number; department: Department; priorityRank: number; rightPoc: boolean } | null>(null);
  const save = useAction((d: NonNullable<typeof edit>) => api.put('/api/admin/designations', { ...d, rightPocMinBucket: null }), {
    success: 'Mapped — matching stakeholders updated', invalidate: [['designations-review'], ['designations'], ['account']], onSuccess: () => setEdit(null),
  });
  const [q, setQ] = useState('');
  const levels = [1, 2, 3, 4, 5].map((l) => ({ l, n: (map.data ?? []).filter((d) => d.level === l).length }));
  return (
    <div className="space-y-4">
      <SectionHead icon={<UserSquare2 />} title="Designations" subtitle="Job titles mapped to seniority and function. This drives calling order, the right-stakeholder check and coverage." />
      <div className="grid grid-cols-5 gap-2">
        {levels.map(({ l, n }) => (
          <div key={l} className="rounded-[18px] border border-line/80 bg-white px-4 py-3">
            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold', LEVEL_PILL[l])}>L{l}</span>
            <p className="mt-2 font-display text-[24px] font-medium leading-none tabular-nums">{n}</p>
            <p className="mt-1 text-[11px] text-ink-muted">{l === 1 ? 'Most senior' : l === 5 ? 'Most junior' : 'titles'}</p>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader title={<span className="flex items-center gap-2">Needs mapping {(review.data ?? []).length > 0 && <span className="rounded-full bg-brand-forest px-2 py-0.5 text-[11px] font-semibold text-white">{review.data!.length}</span>}</span>} subtitle="Titles we couldn’t place. Map them once and every matching stakeholder gets a level and department." />
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
        <CardHeader title={`Designation map · ${map.data?.length ?? 0}`} action={<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter titles…" className="w-56 rounded-full" />} />
        <div className="max-h-[520px] overflow-y-auto p-3 scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-2xs uppercase tracking-wide text-ink-muted"><th className="px-2 py-1.5 font-medium">Designation</th><th className="px-2 font-medium">Level</th><th className="px-2 font-medium">Department</th><th className="px-2 font-medium">Priority</th><th className="px-2 font-medium">Right POC</th></tr></thead>
            <tbody>
              {map.data?.filter((d) => d.designation.toLowerCase().includes(q.toLowerCase())).map((d) => (
                <tr key={d.id} onClick={() => setEdit({ designation: d.designation, level: d.level, department: d.department, priorityRank: d.priorityRank, rightPoc: d.rightPoc })} className="cursor-pointer border-t border-line/70 hover:bg-canvas">
                  <td className="px-2 py-1.5 font-medium">{d.designation}</td><td className="px-2"><span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold', LEVEL_PILL[d.level])}>L{d.level}</span></td><td className="px-2"><span className="rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[12px] font-medium">{humanize(d.department)}</span></td><td className="px-2 tabular-nums">{d.priorityRank}</td><td className="px-2">{d.rightPoc && <Check className="h-4 w-4 text-brand-mint" strokeWidth={3} />}</td>
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
  const max = Math.max(30, ...rows.flatMap((r) => [r.inactivityFlagDays ?? 0, r.stagnationDays ?? 0, r.followUpIntervalDays ?? 0]));
  return (
    <div>
      <SectionHead icon={<Gauge />} title="Stage thresholds" subtitle="When an account gets flagged for inactivity, when a stage counts as stuck, and how often follow-ups fall due."
        actions={<Button variant="primary" icon={<Check className="h-3.5 w-3.5" />} loading={save.isPending} onClick={() => save.mutate(undefined)}>Save changes</Button>} />
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((r, i) => (
          <div key={r.stage} className="rounded-[22px] border border-line/80 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-[17px] font-medium tracking-[-0.02em]">{stageLabel[r.stage] ?? r.stage}</p>
              <span className="rounded-full bg-brand-forest-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-forest">{r.stage}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {([['inactivityFlagDays', 'Flag after', 'days idle'], ['stagnationDays', 'Stuck after', 'days'], ['followUpIntervalDays', 'Follow-up', 'every N days']] as const).map(([k, l, u]) => (
                <label key={k} className="rounded-2xl bg-canvas px-3 py-2.5">
                  <span className="block text-[11px] font-medium text-ink-muted">{l}</span>
                  <input type="number" min={0} value={r[k] ?? ''} placeholder="—"
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value === '' ? undefined : Number(e.target.value) } : x)))}
                    className="mt-0.5 w-full bg-transparent font-display text-[24px] font-medium leading-none tracking-[-0.03em] tabular-nums outline-none" />
                  <span className="block text-[10.5px] text-ink-muted">{u}</span>
                </label>
              ))}
            </div>
            <div className="relative mt-4 h-2 rounded-full bg-black/[0.05]">
              {r.followUpIntervalDays ? <span title="Follow-up" className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#7CCB8E]" style={{ left: `${(100 * r.followUpIntervalDays) / max}%` }} /> : null}
              {r.inactivityFlagDays ? <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-mint to-brand-forest" style={{ width: `${(100 * r.inactivityFlagDays) / max}%` }} /> : null}
              {r.stagnationDays ? <span title="Stuck" className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-navy" style={{ left: `${(100 * r.stagnationDays) / max}%` }} /> : null}
            </div>
            <p className="mt-2 flex gap-3 text-[10.5px] text-ink-muted"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-forest" />Flag window</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-navy" />Stuck</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#7CCB8E]" />Follow-up</span></p>
          </div>
        ))}
      </div>
    </div>
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
    <div>
      <SectionHead icon={<ListChecks />} title="Stage requirements" subtitle="The checklist AEs work through at each stage. Items marked “needed to move on” must be ticked before the next meeting can advance the deal."
        actions={<Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setEdit(newItem())}>Add item</Button>} />
      <div className="mb-3 flex"><Tabs value={stage} onChange={setStage} tabs={CHECKLIST_STAGES.map((st) => ({ value: st, label: st, count: (data ?? []).filter((i) => i.stage === st).length }))} /></div>
      <Card className="p-2">
        {isLoading ? <SkeletonRows rows={4} /> : items.length === 0 ? <p className="px-2 py-6 text-center text-xs text-ink-muted">No items for {stage} yet.</p> : (
          <ul className="space-y-1.5 p-1">
            {items.map((it, i) => (
              <li key={it.id} className={cn('group flex items-center gap-3 rounded-[16px] border px-3.5 py-3 transition-all hover:border-brand-forest/25', it.exitStep ? 'border-brand-forest/20 bg-brand-forest-50/50' : 'border-line/70 bg-white')}>
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-[13px] font-medium tabular-nums', it.exitStep ? 'bg-brand-forest text-white' : 'bg-canvas text-ink-soft')}>{i + 1}</span>
                <p className="flex-1 text-[13.5px] font-semibold">{it.label}</p>
                {it.exitStep && <Badge className="bg-brand-forest text-white">Needed to move on</Badge>}
                {it.requiresAttachment && <Badge tone="accent">Needs file / link</Badge>}
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
      </Card>
      <ChecklistItemModal item={edit} onClose={() => setEdit(null)} saving={upsert.isPending}
        onSave={(it) => upsert.mutate(it, { onSuccess: () => { toast.success(it.id ? 'Item updated' : 'Item added'); setEdit(null); } })} />
    </div>
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
  const fill = (t: string) => t.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, k: string) => `⟦${k}⟧`);
  const Rich = ({ text }: { text: string }) => (
    <>{fill(text).split(/(⟦[^⟧]+⟧)/).map((part, i) => part.startsWith('⟦')
      ? <span key={i} className="rounded-md bg-brand-mint/15 px-1 font-semibold text-brand-forest">{part.slice(1, -1)}</span> : <span key={i}>{part}</span>)}</>
  );
  return (
    <div>
      <SectionHead icon={<Mail />} title="Email templates" subtitle="Sequence and internal emails. Merge fields like {{First Name}} and {{Company}} fill in automatically." />
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((t) => (
          <button key={t.id} onClick={() => setEdit(t)} className="group flex flex-col rounded-[22px] border border-line/80 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-forest/25 hover:shadow-[0_18px_36px_-24px_rgba(5,63,26,.6)]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-forest-50 text-brand-forest"><Mail className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><p className="truncate font-display text-[16px] font-medium tracking-[-0.01em]">{t.name}</p><p className="font-mono text-[10.5px] text-ink-muted">{t.code} · v{t.version}</p></div>
              {t.internal && <Badge tone="accent">Internal</Badge>}{!t.active && <Badge>Off</Badge>}
            </div>
            <div className="mt-4 rounded-2xl bg-canvas p-3.5">
              <p className="truncate text-[13px] font-semibold"><Rich text={t.subject} /></p>
              <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[12px] leading-relaxed text-ink-muted"><Rich text={t.body} /></p>
            </div>
            <span className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-brand-forest opacity-0 transition-opacity group-hover:opacity-100"><Pencil className="h-3 w-3" />Edit template</span>
          </button>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.name ?? ''} subtitle="Edit on the left, see the email on the right." width="max-w-5xl"
        footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={save.isPending} onClick={() => { if (!edit?.subject.trim()) { toast.error('Subject is required'); return; } save.mutate(edit); }}>Save template</Button></>}>
        {edit && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Field label="Subject"><Input value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></Field>
              <Field label="Body"><Textarea rows={14} className="font-mono text-xs" value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
              <div className="flex items-center gap-3"><Switch checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" /><span className="text-[13px]">Active</span></div>
            </div>
            <div className="rounded-[20px] border border-line bg-canvas p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Preview</p>
              <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(13,13,13,.05)]">
                <p className="border-b border-line pb-2 text-[14px] font-semibold"><Rich text={edit.subject} /></p>
                <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft"><Rich text={edit.body} /></p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
