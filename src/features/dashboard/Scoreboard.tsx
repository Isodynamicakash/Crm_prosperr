import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { periodLabel, periodParams, type Preset } from './pulse';

interface BdrRow { userId: string; name: string; l1Booked: number; l1Done: number; l2Done: number; l3Done: number; calls: number; l1DoneTarget: number | null; l1BookedTarget: number | null }
interface AeRow { userId: string; name: string; l1Done: number; l2Done: number; l3Done: number; won: number; lost: number; openDeals: number; outcomesOverdue: number }
interface Board { from: string; to: string; bdrs: BdrRow[]; aes: AeRow[] }

const n = (v: unknown) => Number(v ?? 0);

/** Who did what in the chosen period: L1 booked and L1/L2/L3 done per BDR (against target) and per AE. */
export function Scoreboard({ preset }: { preset: Preset }) {
  const [tab, setTab] = useState<'bdr' | 'ae'>('bdr');
  const q = useQuery({ queryKey: ['dashboard', 'scoreboard', preset], queryFn: () => api.get<Board>('/api/dashboards/scoreboard', periodParams(preset)) });
  const bdrs = (q.data?.bdrs ?? []).filter((r) => n(r.l1Booked) + n(r.l1Done) + n(r.l2Done) + n(r.l3Done) + n(r.calls) > 0 || r.l1DoneTarget != null);
  const aes = (q.data?.aes ?? []).filter((r) => n(r.l1Done) + n(r.l2Done) + n(r.l3Done) + n(r.won) + n(r.lost) + n(r.openDeals) > 0);
  const tot = <T extends object>(rows: T[], k: string) => rows.reduce((a, r) => a + n((r as Record<string, unknown>)[k]), 0);

  return (
    <section className="rounded-[24px] border border-line/80 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-display text-[18px] font-medium tracking-[-0.02em]"><Users className="h-4 w-4 text-brand-forest" />Team scoreboard</p>
          <p className="text-xs text-ink-muted">{periodLabel(preset)}{q.data && ` · ${q.data.from} to ${q.data.to}`} · L1 counts by meeting date; targets from the monthly plan</p>
        </div>
        <div className="inline-flex rounded-full border border-line bg-canvas p-1">
          {(['bdr', 'ae'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('h-8 rounded-full px-4 text-xs font-semibold', tab === t ? 'bg-brand-forest text-white' : 'text-ink-soft hover:text-ink')}>
              {t === 'bdr' ? `BDRs · ${bdrs.length}` : `AEs · ${aes.length}`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        {tab === 'bdr' ? (
          <table className="w-full min-w-[640px] text-[13px]">
            <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.08em] text-ink-muted">
              <th className="py-2 pr-3 font-semibold">BDR</th><th className="px-2 text-right font-semibold">Calls</th><th className="px-2 text-right font-semibold">L1 booked</th>
              <th className="px-2 font-semibold">L1 done vs target</th><th className="px-2 text-right font-semibold">L2 done</th><th className="px-2 text-right font-semibold">L3 done</th>
            </tr></thead>
            <tbody>
              {bdrs.map((r) => {
                const target = r.l1DoneTarget == null ? null : n(r.l1DoneTarget);
                const pct = target ? Math.round((100 * n(r.l1Done)) / target) : null;
                return (
                  <tr key={r.userId} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{r.name}</td>
                    <td className="px-2 text-right tabular-nums">{n(r.calls)}</td>
                    <td className="px-2 text-right tabular-nums">{n(r.l1Booked)}{r.l1BookedTarget != null && <span className="text-ink-muted"> / {n(r.l1BookedTarget)}</span>}</td>
                    <td className="px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-14 shrink-0 tabular-nums"><b>{n(r.l1Done)}</b>{target != null && <span className="text-ink-muted"> / {target}</span>}</span>
                        {pct != null ? (
                          <>
                            <span className="h-2 min-w-[80px] flex-1 overflow-hidden rounded-full bg-brand-forest-50">
                              <span className={cn('block h-full rounded-full', pct >= 100 ? 'bg-brand-mint' : 'bg-brand-forest')} style={{ width: `${Math.min(100, pct)}%` }} />
                            </span>
                            <span className={cn('w-10 shrink-0 text-right text-xs font-semibold tabular-nums', pct >= 100 ? 'text-[#1A7F36]' : 'text-ink-soft')}>{pct}%</span>
                          </>
                        ) : <span className="text-xs text-ink-muted">no target</span>}
                      </div>
                    </td>
                    <td className="px-2 text-right tabular-nums">{n(r.l2Done)}</td>
                    <td className="px-2 text-right tabular-nums">{n(r.l3Done)}</td>
                  </tr>
                );
              })}
              {bdrs.length > 0 && (
                <tr className="bg-canvas/60 font-semibold">
                  <td className="py-2 pr-3">Team</td><td className="px-2 text-right tabular-nums">{tot(bdrs, 'calls')}</td>
                  <td className="px-2 text-right tabular-nums">{tot(bdrs, 'l1Booked')}</td>
                  <td className="px-2 tabular-nums">{tot(bdrs, 'l1Done')}{bdrs.some((r) => r.l1DoneTarget != null) && <span className="font-normal text-ink-muted"> / {tot(bdrs, 'l1DoneTarget')}</span>}</td>
                  <td className="px-2 text-right tabular-nums">{tot(bdrs, 'l2Done')}</td><td className="px-2 text-right tabular-nums">{tot(bdrs, 'l3Done')}</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[640px] text-[13px]">
            <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.08em] text-ink-muted">
              <th className="py-2 pr-3 font-semibold">AE</th><th className="px-2 text-right font-semibold">L1 done</th><th className="px-2 text-right font-semibold">L2 done</th>
              <th className="px-2 text-right font-semibold">L3 done</th><th className="px-2 text-right font-semibold">Won</th><th className="px-2 text-right font-semibold">Lost</th>
              <th className="px-2 text-right font-semibold">Open deals</th><th className="px-2 text-right font-semibold">Outcomes overdue</th>
            </tr></thead>
            <tbody>
              {aes.map((r) => (
                <tr key={r.userId} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{r.name}</td>
                  <td className="px-2 text-right tabular-nums">{n(r.l1Done)}</td><td className="px-2 text-right tabular-nums">{n(r.l2Done)}</td>
                  <td className="px-2 text-right tabular-nums">{n(r.l3Done)}</td><td className="px-2 text-right tabular-nums">{n(r.won)}</td>
                  <td className="px-2 text-right tabular-nums">{n(r.lost)}</td><td className="px-2 text-right tabular-nums">{n(r.openDeals)}</td>
                  <td className="px-2 text-right tabular-nums">{n(r.outcomesOverdue) > 0
                    ? <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-xs font-semibold text-brand-navy">{n(r.outcomesOverdue)}</span> : 0}</td>
                </tr>
              ))}
              {aes.length > 0 && (
                <tr className="bg-canvas/60 font-semibold">
                  <td className="py-2 pr-3">Team</td>
                  {['l1Done', 'l2Done', 'l3Done', 'won', 'lost', 'openDeals', 'outcomesOverdue'].map((k) => <td key={k} className="px-2 text-right tabular-nums">{tot(aes, k)}</td>)}
                </tr>
              )}
            </tbody>
          </table>
        )}
        {q.isLoading && <p className="py-6 text-center text-xs text-ink-muted">Loading…</p>}
        {q.data && (tab === 'bdr' ? bdrs : aes).length === 0 && <p className="py-6 text-center text-xs text-ink-muted">Nothing in this period.</p>}
      </div>
    </section>
  );
}
