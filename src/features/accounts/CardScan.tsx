import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Camera, CheckCircle2, Loader2, QrCode, ScanLine, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useCities, usePicklist } from '@/lib/queries';
import { Modal } from '@/components/ui/overlay';
import { Button, Field, Input, Select } from '@/components/ui/ui';
import { useAiStatus } from '@/features/calls/VoiceNote';

export interface CardFields { fullName: string | null; designation: string | null; department: string | null; company: string | null;
  emails: string[]; phones: string[]; website: string | null; linkedin: string | null; city: string | null }
interface ScanResult { card: CardFields; confidence: Record<string, number>; source?: Record<string, 'qr' | 'ocr'>; checks?: string[];
  suggestions?: { company?: { id: string; name: string }; designation?: string };
  matches: { person: { stakeholderId: string; name: string; accountId: string; company: string } | null; company: { id: string; name: string } | null } }

/** Phone photos are large and sometimes not JPEG: redraw to a JPEG of at most 2000px so the upload is quick. */
async function toJpeg(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.9));
  } catch {
    return file;                                       // the server still accepts JPG / PNG as they are
  }
}

export async function scanCard(file: File): Promise<ScanResult> {
  const fd = new FormData();
  const img = await toJpeg(file);
  fd.append('image', img, img === file ? file.name : 'card.jpg');
  return api.post<ScanResult>('/api/ai/card', fd);
}

/** Small "Scan visiting card" button for the Add stakeholder form: fills the fields it can read. */
export function CardScanButton({ onResult }: { onResult: (c: CardFields) => void }) {
  const ai = useAiStatus();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!ai.data?.voiceNotes) return null;
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { const r = await scanCard(f); onResult(r.card); toast.success('Card read. Check the fields before saving.'); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <>
      <Button size="sm" variant="subtle" icon={busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />} disabled={busy}
        onClick={() => input.current?.click()}>{busy ? 'Reading card…' : 'Scan visiting card'}</Button>
      <input ref={input} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden"
        onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
    </>
  );
}

const DEPARTMENTS = [['FINANCE', 'Finance'], ['HR', 'HR'], ['PAYROLL', 'Payroll'], ['OTHER', 'Other']] as const;
const CITY_ALIASES: Record<string, string> = { bangalore: 'Bengaluru', gurgaon: 'Gurugram', bombay: 'Mumbai', madras: 'Chennai', 'new delhi': 'Delhi' };

/**
 * Event flow: photograph a visiting card, check what was read (low-confidence fields are flagged, duplicates shown),
 * then save. The company is created or joined through the normal New account path, then the person is added.
 */
export function CardScanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cities = useCities();
  const sources = usePicklist('LEAD_SOURCE');
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<'scan' | 'save' | null>(null);
  const [res, setRes] = useState<ScanResult | null>(null);
  const [f, setF] = useState({ company: '', website: '', cityId: '', fullName: '', designation: '', department: '', emails: '', phones: '', linkedin: '' });

  const reset = () => { setPreview(null); setRes(null); setBusy(null); };
  const close = () => { reset(); onClose(); };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const pick = async (file?: File) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file)); setBusy('scan'); setRes(null);
    try {
      const r = await scanCard(file);
      const c = r.card;
      const cityName = c.city ? (CITY_ALIASES[c.city.toLowerCase()] ?? c.city) : '';
      const city = cities.data?.find((x) => x.name.toLowerCase() === cityName.toLowerCase());
      setF({ company: c.company ?? '', website: c.website ?? '', cityId: city?.id ?? '', fullName: c.fullName ?? '', designation: c.designation ?? '',
        department: c.department ?? '', emails: c.emails.join(', '), phones: c.phones.join(', '), linkedin: c.linkedin ?? '' });
      setRes(r);
    } catch (e) {
      toast.error((e as Error).message); setPreview(null);
    } finally { setBusy(null); }
  };

  const save = async () => {
    setBusy('save');
    try {
      const eventSource = sources.data?.find((s) => s.code === 'EVENT')?.id ?? null;
      const acc = await api.post<{ account: { id: string; name: string }; created: boolean }>('/api/accounts', {
        name: f.company.trim(), website: f.website.trim() || null, cityId: f.cityId || null, industryId: null, leadSourceId: eventSource,
        employeeCount: null, licensePotential: null,
      });
      await api.post(`/api/accounts/${acc.account.id}/stakeholders`, {
        fullName: f.fullName.trim(), designation: f.designation.trim() || null, department: f.department || null,
        emails: f.emails.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean), phones: f.phones.split(/[,;]+/).map((x) => x.trim()).filter(Boolean),
        linkedinUrl: f.linkedin.trim() || null, referredById: null, primarySpoc: false, decisionMaker: false,
      });
      ['accounts', 'my-day', 'account'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`${f.fullName.trim()} added to ${acc.account.name}${acc.created ? ' (new company)' : ''}`);
      close();
      navigate(`/accounts/${acc.account.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  };

  // only flag fields that were read and look unsure
  const unsure = (k: string, v: string) => !!res && !!v && (res.confidence[k] ?? 1) < 0.8;
  const field = (k: string, v: string) => cn(unsure(k, v) && 'border-brand-navy/50 bg-brand-navy/5');
  const dupe = res?.matches.person;

  return (
    <Modal open={open} onClose={close} width="max-w-2xl" title="Scan a visiting card"
      subtitle="Take a photo or choose one. Nothing is saved until you check the details."
      footer={res ? <>
        <Button onClick={reset}>Scan another</Button>
        <Button variant="primary" disabled={!f.company.trim() || !f.fullName.trim() || !!dupe || busy !== null} loading={busy === 'save'} onClick={save}>
          Save contact</Button>
      </> : <Button onClick={close}>Cancel</Button>}>
      {!res && (
        <button type="button" disabled={busy !== null} onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files[0]); }}
          className="relative flex w-full flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-brand-forest/25 bg-brand-forest-50/40 px-6 py-10 text-center hover:border-brand-forest/50">
          {preview && <img src={preview} alt="" className="absolute inset-0 h-full w-full object-contain opacity-30" />}
          {busy === 'scan' ? <Loader2 className="relative h-8 w-8 animate-spin text-brand-forest" /> : <Camera className="relative h-8 w-8 text-brand-forest" />}
          <span className="relative text-[14px] font-semibold">{busy === 'scan' ? 'Reading the card… about 5 seconds' : 'Take a photo of the card, or choose one'}</span>
          <span className="relative text-xs text-ink-muted">JPG or PNG · works in English and Indian languages · keep the card flat and well lit</span>
        </button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden"
        onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />

      {res && (
        <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          {preview && <img src={preview} alt="The scanned card" className="max-h-40 w-full rounded-xl border border-line object-contain sm:max-h-none" />}
          <div className="space-y-3">
            {dupe ? (
              <p className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2 text-[13px] text-brand-navy">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span><b>{dupe.name}</b> is already in the CRM at {dupe.company}. <button type="button" className="font-semibold underline" onClick={() => { close(); navigate(`/accounts/${dupe.accountId}?stakeholder=${dupe.stakeholderId}`); }}>Open their record</button></span>
              </p>
            ) : res.matches.company ? (
              <p className="flex items-start gap-2 rounded-xl bg-brand-forest-50 px-3 py-2 text-[13px] text-brand-forest">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span><b>{res.matches.company.name}</b> is already in the CRM. The contact will be added there.</span>
              </p>
            ) : (
              <p className="text-xs text-ink-muted">New company: it will be created with lead source <b>Event</b>.</p>
            )}
            {Object.entries(res.confidence).some(([k, c]) => c < 0.8 && (res.card as unknown as Record<string, unknown>)[k]) &&
              <p className="text-xs text-brand-navy">Highlighted fields were hard to read. Check them against the card.</p>}
            {(res.suggestions?.company && f.company !== res.suggestions.company.name) && (
              <p className="flex items-center gap-2 text-[13px]"><Sparkles className="h-3.5 w-3.5 text-brand-forest" />
                Did you mean <b>{res.suggestions.company.name}</b>, already in the CRM?
                <button type="button" className="font-semibold text-brand-forest underline" onClick={() => setF({ ...f, company: res.suggestions!.company!.name })}>Use it</button></p>
            )}
            {(res.suggestions?.designation && f.designation !== res.suggestions.designation) && (
              <p className="flex items-center gap-2 text-[13px]"><Sparkles className="h-3.5 w-3.5 text-brand-forest" />
                Known title: <b>{res.suggestions.designation}</b>
                <button type="button" className="font-semibold text-brand-forest underline" onClick={() => setF({ ...f, designation: res.suggestions!.designation! })}>Use it</button></p>
            )}
            {(res.checks?.length ?? 0) > 0 && (
              <details className="rounded-xl bg-canvas px-3 py-2 text-xs text-ink-muted">
                <summary className="cursor-pointer font-semibold text-ink">{Object.values(res.source ?? {}).includes('qr') && <QrCode className="mr-1 inline h-3.5 w-3.5 text-brand-forest" />}
                  {res.checks!.length} check{res.checks!.length > 1 ? 's' : ''} on what was read</summary>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">{res.checks!.map((c) => <li key={c}>{c}</li>)}</ul>
              </details>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name" required><Input id="card-name" value={f.fullName} onChange={set('fullName')} className={field('fullName', f.fullName)} /></Field>
              <Field label="Designation"><Input id="card-title" value={f.designation} onChange={set('designation')} className={field('designation', f.designation)} /></Field>
              <Field label="Company" required><Input id="card-company" value={f.company} onChange={set('company')} className={field('company', f.company)} /></Field>
              <Field label="Function">
                <Select id="card-dept" value={f.department} onChange={set('department')}>
                  <option value="">Select…</option>{DEPARTMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Email(s)" className="col-span-2"><Input id="card-emails" value={f.emails} onChange={set('emails')} className={field('emails', f.emails)} /></Field>
              <Field label="Phone(s)" className="col-span-2"><Input id="card-phones" value={f.phones} onChange={set('phones')} className={field('phones', f.phones)} /></Field>
              <Field label="Website"><Input id="card-web" value={f.website} onChange={set('website')} className={field('website', f.website)} /></Field>
              <Field label="City">
                <Select id="card-city" value={f.cityId} onChange={set('cityId')}>
                  <option value="">{res.card.city ? `${res.card.city} (not in list)` : 'Select…'}</option>
                  {cities.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
