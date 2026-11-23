import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarCheck2, CalendarClock, Link2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

interface GoogleStatus { available: boolean; connected: boolean; email?: string; status?: string; lastError?: string }

export function useGoogleStatus() {
  return useQuery({
    queryKey: ['google-status'],
    queryFn: () => api.get<GoogleStatus>('/api/integrations/google'),
    staleTime: 60_000, refetchInterval: false, retry: false,
  });
}

const REASONS: Record<string, string> = {
  access_denied: 'You cancelled the Google permission screen.',
  account_in_use: 'That Google account is already connected to another CRM user.',
  calendar_not_allowed: 'Tick the Calendar permission on the Google screen and try again.',
  no_offline_access: 'Google didn’t grant lasting access. Try connecting again.',
  expired: 'The connect link expired. Try again.',
};

/** Sidebar control: connect / reconnect Google (Calendar + Gmail) and show which account is linked. */
export function GoogleConnect({ dark = true }: { dark?: boolean }) {
  const t = useT();
  const qc = useQueryClient();
  const s = useGoogleStatus();

  // Google sends the browser back to /?google=connected (or an error code).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const r = p.get('google');
    if (!r) return;
    if (r === 'connected') toast.success(t('google.connected'));
    else toast.error(REASONS[r] ?? t('google.failed'));
    p.delete('google');
    window.history.replaceState(null, '', window.location.pathname + (p.toString() ? `?${p}` : ''));
    void qc.invalidateQueries({ queryKey: ['google-status'] });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s.data?.available) return null;
  const connect = async () => {
    try {
      const { url } = await api.post<{ url: string }>('/api/integrations/google/connect', { returnTo: window.location.origin });
      window.location.href = url;
    } catch (e) { toast.error((e as Error).message); }
  };
  const expired = s.data.status === 'EXPIRED';

  if (s.data.connected) {
    return (
      <div className={cn('mb-2 flex h-9 items-center gap-2 rounded-xl px-2.5 text-[12px]', dark ? 'border border-white/10 bg-white/[0.04] text-paper/70' : 'border border-line bg-white')}
        title={t('google.connectedAs', { email: s.data.email ?? '' })}>
        <CalendarCheck2 className="h-3.5 w-3.5 shrink-0 text-brand-mint" />
        <span className="min-w-0 flex-1 truncate">{s.data.email}</span>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-mint" />
      </div>
    );
  }
  return (
    <button onClick={connect}
      className={cn('mb-2 flex h-9 w-full items-center gap-2 rounded-xl px-2.5 text-left text-[12px] font-semibold transition-colors',
        dark ? 'border border-brand-mint/30 bg-brand-mint/10 text-paper hover:bg-brand-mint/20' : 'border border-brand-forest/30 bg-brand-forest-50 text-brand-forest')}>
      <Link2 className="h-3.5 w-3.5 shrink-0 text-brand-mint" />
      <span className="min-w-0 flex-1 truncate">{expired ? t('google.reconnect') : t('google.connect')}</span>
    </button>
  );
}

interface Busy { userId: string; name: string; connected: boolean; busy: { start: string; end: string }[] }

const hm = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

/**
 * Shows who is busy when on the chosen day (from their Google Calendars) and warns if the picked time clashes.
 * `local` is a datetime-local value; `durationMin` the meeting length.
 */
export function BusyStrip({ local, durationMin, userIds }: { local: string; durationMin: number; userIds: (string | undefined)[] }) {
  const t = useT();
  const status = useGoogleStatus();
  const ids = Array.from(new Set(userIds.filter(Boolean) as string[]));
  const date = local ? local.slice(0, 10) : '';
  const q = useQuery({
    queryKey: ['google-busy', date, ids.join(',')],
    queryFn: () => api.get<Busy[]>('/api/integrations/google/busy', { date, userIds: ids }),
    enabled: !!status.data?.available && !!date,
    staleTime: 60_000, refetchInterval: false, retry: false,
  });
  if (!status.data?.available || !date) return null;
  if (q.isLoading) return <p className="flex items-center gap-1.5 text-xs text-ink-muted"><Loader2 className="h-3 w-3 animate-spin" />{t('google.checking')}</p>;
  const rows = (q.data ?? []).filter((r) => r.connected);
  if (!rows.length) return <p className="text-xs text-ink-muted">{t('google.noCalendars')}</p>;

  const start = new Date(local).getTime();
  const end = start + durationMin * 60_000;
  const clash = rows.flatMap((r) => r.busy.filter((b) => new Date(b.start).getTime() < end && new Date(b.end).getTime() > start).map(() => r.name));

  return (
    <div className={cn('rounded-xl border px-3 py-2 text-xs', clash.length ? 'border-brand-navy/25 bg-[#E9EBF3] text-brand-navy' : 'border-brand-forest/15 bg-brand-forest-50/70 text-brand-forest')}>
      <p className="mb-1 flex items-center gap-1.5 font-semibold"><CalendarClock className="h-3.5 w-3.5" />
        {clash.length ? t('google.clash', { names: Array.from(new Set(clash)).join(', ') }) : t('google.free')}</p>
      {rows.map((r) => (
        <p key={r.userId} className="truncate text-ink-soft">
          <span className="font-medium text-ink">{r.name}:</span>{' '}
          {r.busy.length ? r.busy.map((b) => `${hm(b.start)}–${hm(b.end)}`).join(', ') : t('google.freeAllDay')}
        </p>
      ))}
    </div>
  );
}
