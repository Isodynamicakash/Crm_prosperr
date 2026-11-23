import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Sparkles, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth';
import { useUsers } from '@/lib/queries';
import { Modal } from '@/components/ui/overlay';
import { Badge, Button, Checkbox, Field, Segmented, Select } from '@/components/ui/ui';

interface Inspect { sheets: string[]; sheet: string | null; headers: string[]; rows: number; sample: Record<string, string | null>[]; suggested: Record<string, string>; maxRows: number }
interface Summary { id: string; status: string; totalRows: number; created?: number; merged?: number; errors?: number; preview: { result: string; n: number }[] }
interface ReportRow { row: number; result: string; message?: string; company?: string; person?: string; email?: string; matchedAccount?: string }

/** CRM fields a column can fill, in the order a person thinks about them. */
const FIELDS: { value: string; label: string; group: string }[] = [
  { value: 'company', label: 'Company name *', group: 'Company' }, { value: 'website', label: 'Website / domain', group: 'Company' },
  { value: 'city', label: 'City', group: 'Company' }, { value: 'industry', label: 'Industry', group: 'Company' },
  { value: 'employeeCount', label: 'Employees', group: 'Company' }, { value: 'taxableEmployeeCount', label: 'Taxable employees', group: 'Company' },
  { value: 'licensePotential', label: 'License potential', group: 'Company' }, { value: 'leadSource', label: 'Lead source', group: 'Company' },
  { value: 'apolloId', label: 'Apollo account ID', group: 'Company' },
  { value: 'fullName', label: 'Full name *', group: 'Person' }, { value: 'firstName', label: 'First name', group: 'Person' },
  { value: 'lastName', label: 'Last name', group: 'Person' }, { value: 'designation', label: 'Designation / title', group: 'Person' },
  { value: 'department', label: 'Department (Finance / HR / Payroll)', group: 'Person' }, { value: 'email', label: 'Email', group: 'Person' },
  { value: 'email2', label: 'Second email', group: 'Person' }, { value: 'phone', label: 'Phone', group: 'Person' },
  { value: 'phone2', label: 'Second phone', group: 'Person' }, { value: 'linkedin', label: 'LinkedIn URL', group: 'Person' },
  { value: 'bdrEmail', label: 'Owner BDR email', group: 'Other' }, { value: 'remarks', label: 'Remarks / notes', group: 'Other' },
];

const RESULT: Record<string, { label: string; tone: 'success' | 'neutral' | 'warning' | 'danger'; hint: string }> = {
  CREATED: { label: 'New company', tone: 'success', hint: 'Company and person will be added' },
  MERGED: { label: 'Joins existing company', tone: 'success', hint: 'Person added to a company already in the CRM' },
  REVIEW: { label: 'Check first', tone: 'warning', hint: 'Phone matches someone already in the CRM' },
  DUPLICATE: { label: 'Already in CRM', tone: 'neutral', hint: 'Skipped: same email or LinkedIn exists' },
  ERROR: { label: 'Has a problem', tone: 'danger', hint: 'Skipped: fix the row and import again' },
};

/**
 * Bring leads in from Excel, CSV or an Apollo export: pick the file (and sheet), match its columns to CRM fields
 * (auto-matched, editable), see a dry run of what will happen to every row, then import.
 */
export function ImportWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const leader = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const users = useUsers(open && leader);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'file' | 'map' | 'check' | 'done'>('file');
  const [source, setSource] = useState<'FILE' | 'APOLLO'>('FILE');
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<Inspect | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [owner, setOwner] = useState('');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [includeReview, setIncludeReview] = useState(false);

  const reset = () => { setStep('file'); setFile(null); setInfo(null); setMapping({}); setSummary(null); setReport([]); setIncludeReview(false); setOwner(''); };
  const close = () => { reset(); onClose(); };

  const inspect = async (f: File, sheet?: string) => {
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', f);
      const r = await api.post<Inspect>('/api/imports/inspect', fd, sheet ? { sheet } : undefined);
      setFile(f); setInfo(r); setMapping(r.suggested); setStep('map');
      if (!r.rows) toast.error('That sheet has no rows. Pick another sheet.');
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const used = new Set(Object.values(mapping));
  const hasCompany = used.has('company');
  const hasName = used.has('fullName') || used.has('firstName');
  const ownerOk = !leader || !!owner || used.has('bdrEmail');

  const check = async () => {
    if (!file || !info) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const q: Record<string, string> = { mapping: JSON.stringify(Object.fromEntries(Object.entries(mapping).filter(([, v]) => v))), source: source === 'APOLLO' ? 'APOLLO' : 'MANUAL_UPLOAD' };
      if (info.sheet) q.sheet = info.sheet;
      if (owner) q.ownerBdrId = owner;
      const s = await api.post<Summary>('/api/imports', fd, q);
      setSummary(s);
      setReport(await api.get<ReportRow[]>(`/api/imports/${s.id}/rows`));
      setStep('check');
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const commit = async () => {
    if (!summary) return;
    setBusy(true);
    try {
      const s = await api.post<Summary>(`/api/imports/${summary.id}/commit`, undefined, { includeReview: String(includeReview) });
      setSummary(s); setReport(await api.get<ReportRow[]>(`/api/imports/${summary.id}/rows`)); setStep('done');
      qc.invalidateQueries({ queryKey: ['accounts'] }); qc.invalidateQueries({ queryKey: ['my-day'] }); qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const counts = useMemo(() => Object.fromEntries((summary?.preview ?? []).map((p) => [p.result, Number(p.n)])) as Record<string, number>, [summary]);
  const willImport = (counts.CREATED ?? 0) + (counts.MERGED ?? 0) + (includeReview ? counts.REVIEW ?? 0 : 0);
  const steps = ['Choose file', 'Match columns', 'Check', 'Done'];
  const at = ['file', 'map', 'check', 'done'].indexOf(step);

  return (
    <Modal open={open} onClose={close} width="max-w-4xl" title="Import leads" subtitle="Excel, CSV or an Apollo export. Nothing is saved until the last step."
      footer={
        step === 'file' ? <Button onClick={close}>Cancel</Button>
        : step === 'map' ? <>
            <span className="mr-auto text-xs text-ink-muted">{!hasCompany ? 'Match a column to Company name.' : !hasName ? 'Match a column to Full name or First name.' : !ownerOk ? 'Pick who owns these leads.' : `${info?.rows ?? 0} rows ready to check`}</span>
            <Button icon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={reset}>Back</Button>
            <Button variant="primary" disabled={!hasCompany || !hasName || !ownerOk || !info?.rows} loading={busy} onClick={check}>Check rows</Button>
          </>
        : step === 'check' ? <>
            <Button icon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => setStep('map')}>Back</Button>
            <Button variant="primary" disabled={!willImport} loading={busy} onClick={commit}>Import {willImport} {willImport === 1 ? 'person' : 'people'}</Button>
          </>
        : <Button variant="primary" onClick={close}>Done</Button>
      }>
      <ol className="mb-5 flex items-center gap-2 text-xs">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn('grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold', i < at ? 'bg-brand-mint text-brand-night' : i === at ? 'bg-brand-forest text-white' : 'bg-canvas text-ink-muted')}>{i < at ? '✓' : i + 1}</span>
            <span className={cn(i === at ? 'font-semibold text-ink' : 'text-ink-muted')}>{s}</span>
            {i < steps.length - 1 && <span className="h-px w-6 bg-line" />}
          </li>
        ))}
      </ol>

      {step === 'file' && (
        <div className="space-y-4">
          <Segmented value={source} onChange={setSource} options={[{ value: 'FILE', label: 'Excel or CSV' }, { value: 'APOLLO', label: 'Apollo export' }]} />
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) inspect(f); }}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-forest/25 bg-brand-forest-50/40 px-6 py-10 text-center transition-colors hover:border-brand-forest/50">
            <FileSpreadsheet className="h-8 w-8 text-brand-forest" />
            <span className="text-[14px] font-semibold">{busy ? 'Reading the file…' : 'Drop a file here or click to choose'}</span>
            <span className="text-xs text-ink-muted">.xlsx or .csv · up to 5,000 rows per file · every sheet in the workbook can be picked next</span>
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) inspect(f); e.target.value = ''; }} />
          <div className="rounded-xl bg-canvas/70 p-3 text-[12.5px] text-ink-soft">
            {source === 'APOLLO'
              ? <>In Apollo: select people → <b>Export</b> → CSV. Columns like First Name, Title, Company, Email, Mobile Phone and Person Linkedin Url are matched for you, and the lead source is set to Apollo.</>
              : <>Any sheet works as long as each row is one person with their company. One row per person; the CRM groups people into companies and skips anyone already in the CRM.</>}
          </div>
        </div>
      )}

      {step === 'map' && info && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <p className="mr-auto text-[13px]"><b>{file?.name}</b> · {info.rows} rows · {info.headers.length} columns
              {Object.keys(info.suggested).length > 0 && <span className="ml-2 inline-flex items-center gap-1 text-brand-forest"><Sparkles className="h-3.5 w-3.5" />{Object.keys(info.suggested).length} matched automatically</span>}</p>
            {info.sheets.length > 1 && (
              <Field label="Sheet" className="w-56">
                <Select value={info.sheet ?? ''} onChange={(e) => file && inspect(file, e.target.value)}>{info.sheets.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
              </Field>
            )}
            {leader && (
              <Field label="Owner BDR" hint={used.has('bdrEmail') ? 'Rows without an owner email go to this BDR' : 'Who will call these leads'} className="w-56">
                <Select value={owner} onChange={(e) => setOwner(e.target.value)}>
                  <option value="">{used.has('bdrEmail') ? 'From the file' : 'Select…'}</option>
                  {users.data?.filter((u) => u.role === 'BDR' && u.active).map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </Select>
              </Field>
            )}
          </div>
          {info.rows > info.maxRows && <p className="rounded-xl bg-canvas px-3 py-2 text-[13px] text-brand-navy">This sheet has {info.rows} rows. Split it into files of up to {info.maxRows} rows.</p>}
          <div className="max-h-[46vh] overflow-auto rounded-xl border border-line">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-white"><tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                <th className="px-3 py-2 font-semibold">Column in your file</th><th className="px-3 font-semibold">Example values</th><th className="w-64 px-3 font-semibold">Goes into</th>
              </tr></thead>
              <tbody>
                {info.headers.map((h) => {
                  const examples = info.sample.map((r) => r[h]).filter(Boolean).slice(0, 2) as string[];
                  const v = mapping[h] ?? '';
                  return (
                    <tr key={h} className={cn('border-b border-line/60 last:border-0', !v && 'text-ink-muted')}>
                      <td className="px-3 py-2 font-medium">{h}</td>
                      <td className="max-w-[260px] truncate px-3 text-xs" title={examples.join(' · ')}>{examples.join(' · ') || '—'}</td>
                      <td className="px-3 py-1.5">
                        <Select value={v} onChange={(e) => setMapping((m) => {
                          const next = { ...m };
                          if (e.target.value) for (const k of Object.keys(next)) if (next[k] === e.target.value) delete next[k];   // a field takes one column
                          if (e.target.value) next[h] = e.target.value; else delete next[h];
                          return next;
                        })} className={cn(v && 'border-brand-forest/40 bg-brand-forest-50/50 font-medium text-ink')}>
                          <option value="">Don’t import</option>
                          {['Company', 'Person', 'Other'].map((g) => (
                            <optgroup key={g} label={g}>{FIELDS.filter((f) => f.group === g).map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</optgroup>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-muted">Cities, industries and lead sources are matched to the CRM's lists by name; anything unknown is left blank and flagged in the next step.</p>
        </div>
      )}

      {(step === 'check' || step === 'done') && summary && (
        <div className="space-y-4">
          {step === 'done' && (
            <div className="flex items-center gap-3 rounded-2xl bg-brand-forest-50 p-4">
              <CheckCircle2 className="h-6 w-6 text-brand-forest" />
              <p className="text-[14px]"><b>Imported.</b> {summary.created ?? 0} new compan{summary.created === 1 ? 'y' : 'ies'}, {summary.merged ?? 0} added to existing ones{summary.errors ? `, ${summary.errors} failed` : ''}. They're in Accounts and your My Day list now.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries(RESULT).map(([k, r]) => (
              <div key={k} className="rounded-xl border border-line/80 p-3" title={r.hint}>
                <p className="font-display text-[22px] tabular-nums">{counts[k] ?? 0}</p>
                <p className="text-[11.5px] text-ink-muted">{r.label}</p>
              </div>
            ))}
          </div>
          {step === 'check' && (counts.REVIEW ?? 0) > 0 && (
            <Checkbox checked={includeReview} onChange={setIncludeReview} label={`Also import the ${counts.REVIEW} “check first” rows (their phone matches someone already in the CRM)`} />
          )}
          <div className="max-h-[38vh] overflow-auto rounded-xl border border-line">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-white"><tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                <th className="px-3 py-2 font-semibold">Row</th><th className="px-3 font-semibold">Person</th><th className="px-3 font-semibold">Company</th><th className="px-3 font-semibold">What happens</th>
              </tr></thead>
              <tbody>
                {report.slice(0, 300).map((r) => (
                  <tr key={r.row} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-1.5 tabular-nums text-ink-muted">{r.row}</td>
                    <td className="px-3">{r.person ?? '—'}{r.email && <span className="text-ink-muted"> · {r.email}</span>}</td>
                    <td className="px-3">{r.company ?? '—'}</td>
                    <td className="px-3"><Badge tone={RESULT[r.result]?.tone ?? 'neutral'}>{RESULT[r.result]?.label ?? r.result}</Badge>
                      {r.message && <span className="ml-1.5 text-ink-muted">{r.message}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>{report.length > 300 ? `Showing 300 of ${report.length} rows.` : `${report.length} rows.`}</span>
            <button type="button" onClick={() => api.download(`/api/imports/${summary.id}/rows`, { format: 'csv' }, 'import-report.csv').catch((e) => toast.error(e.message))}
              className="flex items-center gap-1 font-semibold text-brand-forest hover:underline"><Download className="h-3.5 w-3.5" />Download full report</button>
          </div>
        </div>
      )}
      {busy && step === 'map' && <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted"><Upload className="h-3.5 w-3.5 animate-pulse" />Checking every row against the CRM…</p>}
    </Modal>
  );
}

