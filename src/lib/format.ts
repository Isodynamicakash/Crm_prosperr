// Display helpers. The business runs on IST, so dates are shown in Asia/Kolkata.
const TZ = 'Asia/Kolkata';

export function initials(name?: string | null) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export function relTime(iso?: string | null) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000);
  const future = diff < 0;
  let s: string;
  if (m < 1) s = 'just now';
  else if (m < 60) s = `${m}m`;
  else if (m < 60 * 24) s = `${Math.round(m / 60)}h`;
  else if (m < 60 * 24 * 2) return future ? 'Tomorrow' : 'Yesterday';
  else if (m < 60 * 24 * 30) s = `${Math.round(m / 1440)}d`;
  else return fmtDate(iso);
  if (s === 'just now') return s;
  return future ? `in ${s}` : `${s} ago`;
}

export function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = iso.length === 10 ? new Date(iso + 'T00:00:00') : new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric', timeZone: iso.length === 10 ? undefined : TZ });
}

export function fmtDateTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TZ });
}

export function fmtTime(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
}

export function inr(n?: number | string | null) {
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

export function num(n?: number | string | null) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-IN');
}

/** "MEETING_SCHEDULED" -> "Meeting scheduled" */
export function humanize(s?: string | null) {
  if (!s) return '—';
  const t = s.toLowerCase().replace(/_/g, ' ');
  const out = t.charAt(0).toUpperCase() + t.slice(1);
  // Keep the acronyms the team uses as acronyms.
  return out.replace(/\b(sql|sqls|hr|bdr|ae|mrr|icp|fbp|dnc|cfo|l1|l2|l3|csv|spoc|bant)\b/gi, (m) => m.toUpperCase().replace('SQLS', 'SQLs'));
}

export function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

/** yyyy-mm-dd + n days */
export function addDaysISO(n: number, from = todayISO()) {
  const d = new Date(from + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
}

/** Converts a datetime-local value (IST wall clock) to an ISO instant. */
export function localToInstant(v: string) {
  return v ? new Date(v).toISOString() : null;
}

export function fullName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(' ');
}

/** Current time as a datetime-local value (local wall clock), for an input's `min`. */
export function nowLocalInput() {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** True when a datetime-local value is earlier than now (the server allows 5 minutes of slack). */
export function isPastLocal(v: string) {
  return !!v && new Date(v).getTime() < Date.now() - 5 * 60000;
}
