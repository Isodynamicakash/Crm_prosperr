// Thin fetch wrapper: adds the CRM token, parses JSON and turns Spring ProblemDetail errors into readable messages.

const TOKEN_KEY = 'prosperr.token';
/** Empty in development (Vite proxies /api). In production set VITE_API_BASE to the backend URL if it runs on another host. */
const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public body?: unknown) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | null | undefined | string[]>;

export function qs(params?: Query): string {
  if (!params) return '';
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => u.append(k, x));
    else u.append(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) { onUnauthorized = fn; }

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  const res = await fetch(BASE + path + qs(query), { method, headers, body: payload });
  const text = await res.text();
  let data: unknown = undefined;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    const d = (data ?? {}) as { detail?: string; title?: string; message?: string; code?: string };
    const msg = d.detail || d.message || d.title || (res.status === 403 ? 'You don’t have access to this.' : `Request failed (${res.status})`);
    throw new ApiError(res.status, msg, d.code, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>('POST', path, body ?? {}, query),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T>(path: string) => request<T>('DELETE', path),
  /** Downloads a CSV/XLSX export through the authenticated API. */
  async download(path: string, query: Query, filename: string) {
    const res = await fetch(BASE + path + qs(query), { headers: { Authorization: `Bearer ${getToken() ?? ''}` } });
    if (!res.ok) throw new ApiError(res.status, 'Export failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
