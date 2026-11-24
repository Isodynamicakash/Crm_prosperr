import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { downloadCsv, PEOPLE_SAMPLE } from '@/lib/csv';
import { useT } from '@/lib/i18n';
import { closestDesignation } from './AccountForms';

interface Row { fullName: string; designation: string | null; emails: string[]; phones: string[]; linkedinUrl: string | null }
const MAX_ROWS = 200;

/** Splits CSV text into rows, honouring quotes, commas or semicolons, and Excel's BOM. */
function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, '');
  const first = t.split(/\r?\n/, 1)[0] ?? '';
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell.trim()); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((r) => r.some((x) => x));
}

const find = (hdr: string[], rx: RegExp) => hdr.findIndex((h) => rx.test(h));
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
const phoneCell = (v: string) => v.split(/[,/;|]/).map((p) => {
  const s = p.trim();
  return /^\d+(\.\d+)?e\+?\d+$/i.test(s) ? String(Math.round(Number(s))) : s.replace(/\.0$/, '');
}).filter((p) => p.replace(/\D/g, '').length >= 10);

function toRows(table: string[][], designations?: { designation: string }[]): { rows: Row[]; skipped: number; columns: string[] } {
  const hdr = (table[0] ?? []).map((h) => h.toLowerCase().trim());
  const iName = find(hdr, /^(full ?name|name|stake ?holder|contact ?name|person)$/);
  const iFirst = find(hdr, /first/); const iLast = find(hdr, /last|surname/);
  const iTitle = find(hdr, /designation|designatin|title|role|position/);
  const iEmail = find(hdr, /e-?mail/); const iPhone = find(hdr, /phone|mobile|contact ?no|number|whatsapp/);
  const iLi = find(hdr, /linked ?in/);
  const columns = [iName >= 0 || iFirst >= 0 ? 'name' : '', iTitle >= 0 ? 'designation' : '', iEmail >= 0 ? 'email' : '',
    iPhone >= 0 ? 'phone' : '', iLi >= 0 ? 'LinkedIn' : ''].filter(Boolean);
  let skipped = 0;
  const rows: Row[] = [];
  for (const r of table.slice(1)) {
    const g = (i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
    const emails = Array.from(new Set((g(iEmail).match(EMAIL) ?? []).map((e) => e.toLowerCase())));
    let fullName = iName >= 0 ? g(iName) : [g(iFirst), g(iLast)].filter(Boolean).join(' ');
    if (!fullName && emails[0]) fullName = emails[0].split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (!fullName || /^(-|--|na|n\/a)$/i.test(fullName)) { skipped++; continue; }
    const title = g(iTitle) || null;
    rows.push({ fullName, designation: title ? closestDesignation(title, designations) ?? title : null,
      emails, phones: phoneCell(g(iPhone)), linkedinUrl: /linkedin\.com/i.test(g(iLi)) ? g(iLi) : null });
  }
  return { rows, skipped, columns };
}

/** "Adding several people?" — load a CSV, preview it, add everyone through the normal stakeholder checks. */
export function StakeholderCsv({ accountId, designations, onDone }: {
  accountId: string; designations?: { designation: string }[]; onDone: () => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement | null>(null);
  const [data, setData] = useState<{ file: string; rows: Row[]; skipped: number; columns: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<{ name: string; why: string }[]>([]);

  const load = async (f: File) => {
    setFailures([]);
    const parsed = toRows(parseCsv(await f.text()), designations);
    if (!parsed.columns.includes('name') && !parsed.columns.includes('email')) {
      toast.error(t('csv.noColumns')); return;
    }
    if (parsed.rows.length > MAX_ROWS) { toast.error(t('csv.tooMany', { n: MAX_ROWS })); return; }
    setData({ file: f.name, ...parsed });
  };

  const addAll = async () => {
    if (!data) return;
    setBusy(true);
    const failed: { name: string; why: string }[] = [];
    for (const r of data.rows) {
      try {
        await api.post(`/api/accounts/${accountId}/stakeholders`, {
          fullName: r.fullName, designation: r.designation, department: null, emails: r.emails, phones: r.phones,
          linkedinUrl: r.linkedinUrl, referredById: null, primarySpoc: false, decisionMaker: false,
        });
      } catch (e) { failed.push({ name: r.fullName, why: (e as Error).message }); }
    }
    setBusy(false);
    await qc.invalidateQueries({ queryKey: ['account', accountId] });
    await qc.invalidateQueries({ queryKey: ['stakeholders', accountId] });
    await qc.invalidateQueries({ queryKey: ['my-day'] });
    const ok = data.rows.length - failed.length;
    if (ok) toast.success(t('csv.added', { n: ok }));
    if (failed.length) { setFailures(failed); setData(null); } else { setData(null); onDone(); }
  };

  return (
    <div className="mt-2">
      <input ref={input} type="file" accept=".csv,text/csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void load(f); }} />
      {!data ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => input.current?.click()}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-forest hover:underline">
            <FileSpreadsheet className="h-3.5 w-3.5" />{t('csv.addMany')}
          </button>
          <button type="button" onClick={() => downloadCsv('prosperr-people-sample.csv', PEOPLE_SAMPLE)}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-brand-forest hover:underline" title="Columns: Name, Designation, Email, Phone, LinkedIn">
            <Download className="h-3.5 w-3.5" />Sample CSV
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-brand-forest/20 bg-white p-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-brand-forest" />
            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{data.file}</p>
            <button type="button" onClick={() => setData(null)} aria-label={t('common.cancel')} className="text-ink-muted hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {t('csv.found', { n: data.rows.length, cols: data.columns.join(', ') })}{data.skipped ? ` ${t('csv.skipped', { n: data.skipped })}` : ''}
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
            {data.rows.slice(0, 50).map((r, i) => (
              <li key={i} className="flex gap-2 rounded-lg bg-brand-forest-50/60 px-2 py-1">
                <span className="font-medium text-ink">{r.fullName}</span>
                <span className="truncate text-ink-muted">{[r.designation, r.emails[0], r.phones[0]].filter(Boolean).join(' · ')}</span>
              </li>
            ))}
          </ul>
          <button type="button" disabled={busy || !data.rows.length} onClick={addAll}
            className="mt-2 flex h-9 items-center gap-1.5 rounded-full bg-brand-forest px-4 text-xs font-semibold text-white disabled:opacity-50">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{t('csv.addN', { n: data.rows.length })}
          </button>
        </div>
      )}
      {failures.length > 0 && (
        <div className="mt-2 rounded-xl border border-brand-navy/20 bg-[#E9EBF3] p-2 text-xs text-brand-navy">
          <p className="font-semibold">{t('csv.failed', { n: failures.length })}</p>
          <ul className="mt-1 max-h-24 overflow-y-auto">{failures.map((f, i) => <li key={i}>{f.name}: {f.why}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
