import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useCities, usePicklist } from '@/lib/queries';
import type { AccountView, Department, StakeholderView } from '@/lib/types';
import { Modal } from '@/components/ui/overlay';
import { Button, Checkbox, Field, Input, Select } from '@/components/ui/ui';

interface Resolution { account: AccountView; created: boolean; alreadyTaken: { name: string; designation?: string; bdrName: string }[] }

/** New prospect. If the company already exists (same domain), the BDR joins it and sees who is already being worked. */
export function AddAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const cities = useCities();
  const industries = usePicklist('INDUSTRY');
  const sources = usePicklist('LEAD_SOURCE');
  const empty = { name: '', website: '', cityId: '', industryId: '', leadSourceId: '', employeeCount: '', licensePotential: '' };
  const [f, setF] = useState(empty);
  const [joined, setJoined] = useState<Resolution | null>(null);
  useEffect(() => { if (open) { setF(empty); setJoined(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useAction(() => api.post<Resolution>('/api/accounts', {
    name: f.name.trim(), website: f.website.trim() || null, cityId: f.cityId || null, industryId: f.industryId || null,
    leadSourceId: f.leadSourceId || null, employeeCount: f.employeeCount ? Number(f.employeeCount) : null,
    licensePotential: f.licensePotential ? Number(f.licensePotential) : null,
  }), {
    invalidate: [['accounts']],
    success: (r) => (r.created ? 'Account created' : null),
    onSuccess: (r) => { if (r.created) { onClose(); navigate(`/accounts/${r.account.id}`); } else setJoined(r); },
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Modal open={open} onClose={onClose} title="New account" subtitle="We check the website domain so the same company is never added twice."
      footer={joined ? <Button variant="primary" onClick={() => { onClose(); navigate(`/accounts/${joined.account.id}`); }}>Open {joined.account.name}</Button> : <>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!f.name.trim()} loading={save.isPending} onClick={() => save.mutate(undefined)}>Create account</Button>
      </>}>
      {joined ? (
        <div className="space-y-3">
          <div className="flex gap-2.5 rounded-lg bg-warning-soft p-3 text-[13px] text-[#202E64]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p><b>{joined.account.name}</b> is already in the CRM. You’ve been added to it, so you can work new stakeholders there.</p>
          </div>
          {joined.alreadyTaken.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-soft">Already being worked — don’t call these people:</p>
              <ul className="divide-y divide-line rounded-lg border border-line">
                {joined.alreadyTaken.map((t, i) => (
                  <li key={i} className="flex justify-between px-3 py-2 text-[13px]"><span>{t.name} <span className="text-ink-muted">· {t.designation}</span></span><span className="text-ink-muted">{t.bdrName}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company name" required className="col-span-2"><Input autoFocus value={f.name} onChange={set('name')} placeholder="Acme Technologies Pvt Ltd" /></Field>
          <Field label="Website" hint="Used to find duplicates" className="col-span-2"><Input value={f.website} onChange={set('website')} placeholder="acme.com" /></Field>
          <Field label="City">
            <Select value={f.cityId} onChange={set('cityId')}>
              <option value="">Select…</option>
              {cities.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.priority !== 'NONE' ? ` · ${c.priority}` : ''}</option>)}
            </Select>
          </Field>
          <Field label="Industry">
            <Select value={f.industryId} onChange={set('industryId')}>
              <option value="">Select…</option>
              {industries.data?.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Employees"><Input type="number" min={0} value={f.employeeCount} onChange={set('employeeCount')} /></Field>
          <Field label="License potential" hint="Sets the size bucket"><Input type="number" min={0} value={f.licensePotential} onChange={set('licensePotential')} /></Field>
          <Field label="Lead source" className="col-span-2">
            <Select value={f.leadSourceId} onChange={set('leadSourceId')}>
              <option value="">Select…</option>
              {sources.data?.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </Field>
        </div>
      )}
    </Modal>
  );
}

const DEPARTMENTS: Department[] = ['FINANCE', 'HR', 'PAYROLL', 'OTHER'];

/** Add a person at an account. Several emails/phones are allowed; duplicates elsewhere are blocked by the server. */
export function AddStakeholderModal({ open, onClose, accountId, stakeholders = [] }: {
  open: boolean; onClose: () => void; accountId: string; stakeholders?: StakeholderView[];
}) {
  const empty = { fullName: '', designation: '', department: '' as Department | '', linkedinUrl: '', referredById: '', primarySpoc: false, decisionMaker: false };
  const [f, setF] = useState(empty);
  const [emails, setEmails] = useState(['']);
  const [phones, setPhones] = useState(['']);
  useEffect(() => { if (open) { setF(empty); setEmails(['']); setPhones(['']); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useAction(() => api.post<StakeholderView>(`/api/accounts/${accountId}/stakeholders`, {
    fullName: f.fullName.trim(), designation: f.designation.trim() || null, department: f.department || null,
    emails: emails.map((e) => e.trim()).filter(Boolean), phones: phones.map((p) => p.trim()).filter(Boolean),
    linkedinUrl: f.linkedinUrl.trim() || null, referredById: f.referredById || null,
    primarySpoc: f.primarySpoc, decisionMaker: f.decisionMaker,
  }), { success: 'Stakeholder added', invalidate: [['account', accountId], ['stakeholders', accountId], ['my-day']], onSuccess: onClose });

  return (
    <Modal open={open} onClose={onClose} title="Add stakeholder" subtitle="Level and department fill in from the designation."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!f.fullName.trim()} loading={save.isPending} onClick={() => save.mutate(undefined)}>Add stakeholder</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name" required><Input autoFocus value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <Field label="Designation" hint="e.g. CFO, HR Head, Payroll Manager"><Input value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} /></Field>
        <MultiInput label="Emails" values={emails} onChange={setEmails} placeholder="name@company.com" />
        <MultiInput label="Phones" values={phones} onChange={setPhones} placeholder="98xxxxxxxx" />
        <Field label="Department" hint="Leave empty to use the designation map">
          <Select value={f.department} onChange={(e) => setF({ ...f, department: e.target.value as Department })}>
            <option value="">Auto</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
          </Select>
        </Field>
        <Field label="LinkedIn"><Input value={f.linkedinUrl} onChange={(e) => setF({ ...f, linkedinUrl: e.target.value })} placeholder="linkedin.com/in/…" /></Field>
        {stakeholders.length > 0 && (
          <Field label="Referred by" className="col-span-2">
            <Select value={f.referredById} onChange={(e) => setF({ ...f, referredById: e.target.value })}>
              <option value="">Nobody</option>
              {stakeholders.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName ?? ''} · {s.designation}</option>)}
            </Select>
          </Field>
        )}
        <div className="col-span-2 flex gap-5 pt-1">
          <Checkbox checked={f.primarySpoc} onChange={(v) => setF({ ...f, primarySpoc: v })} label="Primary SPOC" />
          <Checkbox checked={f.decisionMaker} onChange={(v) => setF({ ...f, decisionMaker: v })} label="Decision maker" />
        </div>
      </div>
    </Modal>
  );
}

function MultiInput({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <Field label={label}>
      <div className="space-y-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex gap-1.5">
            <Input value={v} placeholder={placeholder} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
            {values.length > 1 && <Button variant="ghost" size="icon" onClick={() => onChange(values.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button>}
          </div>
        ))}
        <button type="button" onClick={() => onChange([...values, ''])} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          <Plus className="h-3 w-3" />Add another
        </button>
      </div>
    </Field>
  );
}

interface DesignationOption { id: string; designation: string; level: number; department: Department }

/** Fix a stakeholder's details. A title from the designation list sets level and department automatically. */
export function EditStakeholderModal({ open, onClose, accountId, stakeholder }: {
  open: boolean; onClose: () => void; accountId: string; stakeholder: StakeholderView;
}) {
  const designations = useQuery({ queryKey: ['designations'], queryFn: () => api.get<DesignationOption[]>('/api/config/designations'), enabled: open, staleTime: 300_000 });
  const init = () => ({
    firstName: stakeholder.firstName, lastName: stakeholder.lastName ?? '', designation: stakeholder.designation ?? '',
    department: (stakeholder.department ?? '') as Department | '', linkedinUrl: stakeholder.linkedinUrl ?? '',
    primarySpoc: stakeholder.primarySpoc, decisionMaker: stakeholder.decisionMaker,
  });
  const [f, setF] = useState(init);
  useEffect(() => { if (open) setF(init()); }, [open, stakeholder.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const norm = (t: string) => t.trim().replace(/\s+/g, ' ').toLowerCase();
  const match = designations.data?.find((d) => norm(d.designation) === norm(f.designation));
  const titleChanged = norm(f.designation) !== norm(stakeholder.designation ?? '');

  const save = useAction(() => api.patch<StakeholderView>(`/api/stakeholders/${stakeholder.id}`, {
    firstName: f.firstName.trim(), lastName: f.lastName.trim(),
    designation: titleChanged ? f.designation.trim() : null,
    department: f.department || null, linkedinUrl: f.linkedinUrl.trim() || null,
    primarySpoc: f.primarySpoc, decisionMaker: f.decisionMaker,
  }), { success: 'Stakeholder updated', invalidate: [['account', accountId], ['stakeholders', accountId], ['my-day']], onSuccess: onClose });

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${stakeholder.firstName}`} subtitle="Pick a title from the list so level and department fill in."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!f.firstName.trim()} loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" required><Input autoFocus value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></Field>
        <Field label="Last name"><Input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></Field>
        <Field label="Designation" className="col-span-2"
          hint={!f.designation.trim() ? 'Start typing to see known titles'
            : match ? `Mapped: L${match.level} · ${match.department.charAt(0) + match.department.slice(1).toLowerCase()}`
            : 'Not in the designation list yet, so it will have no level. An admin can map it in Settings → Designations.'}>
          <Input list="designation-options" value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} placeholder="e.g. Head of Finance" />
          <datalist id="designation-options">
            {designations.data?.map((d) => <option key={d.id} value={d.designation}>L{d.level} · {d.department}</option>)}
          </datalist>
        </Field>
        <Field label="Department" hint="Auto uses the designation list">
          <Select value={f.department} onChange={(e) => setF({ ...f, department: e.target.value as Department })}>
            <option value="">Auto</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
          </Select>
        </Field>
        <Field label="LinkedIn"><Input value={f.linkedinUrl} onChange={(e) => setF({ ...f, linkedinUrl: e.target.value })} placeholder="linkedin.com/in/…" /></Field>
        <div className="col-span-2 flex gap-5 pt-1">
          <Checkbox checked={f.primarySpoc} onChange={(v) => setF({ ...f, primarySpoc: v })} label="Primary SPOC" />
          <Checkbox checked={f.decisionMaker} onChange={(v) => setF({ ...f, decisionMaker: v })} label="Decision maker" />
        </div>
      </div>
    </Modal>
  );
}
