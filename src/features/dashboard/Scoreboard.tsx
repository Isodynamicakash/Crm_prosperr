import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { periodLabel, periodParams, type Preset } from './pulse';

interface BdrRow { userId: string; name: string; l1Booked: number; l1Done: number; l2Done: number; l3Done: number; calls: number; l1DoneTarget: number | null; l1BookedTarget: number | null; l2DoneTarget?: number | null; l3DoneTarget?: number | null }
interface AeRow { userId: string; name: string; l1Done: number; l2Done: number; l3Done: number; won: number; lost: number; openDeals: number; outcomesOverdue: number }
interface Board { from: string; to: string; bdrs: BdrRow[]; aes: AeRow[] }

const n = (v: unknown) => Number(v ?? 0);
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fmtNum = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

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
          <p className="text-xs text-ink-muted">{preset.startsWith('custom:') || !q.data ? periodLabel(preset) : `${periodLabel(preset)} · ${fmtDay(q.data.from)} to ${fmtDay(q.data.to)}`} · L1 counts by meeting date; targets from the monthly plan</p>
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
                const shown = target == null ? null : fmtNum(target);
                const pct = target ? Math.round((100 * n(r.l1Done)) / target) : null;
                return (
                  <tr key={r.userId} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{r.name}</td>
                    <td className="px-2 text-right tabular-nums">{n(r.calls)}</td>
                    <td className="px-2 text-right tabular-nums">{n(r.l1Booked)}{r.l1BookedTarget != null && <span className="text-ink-muted"> / {fmtNum(n(r.l1BookedTarget))}</span>}</td>
                    <td className="px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-14 shrink-0 tabular-nums"><b>{n(r.l1Done)}</b>{shown != null && <span className="text-ink-muted"> / {shown}</span>}</span>
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
                    <td className="px-2 text-right tabular-nums">{n(r.l2Done)}{r.l2DoneTarget != null && <span className="text-ink-muted"> / {fmtNum(n(r.l2DoneTarget))}</span>}</td>
                    <td className="px-2 text-right tabular-nums">{n(r.l3Done)}{r.l3DoneTarget != null && <span className="text-ink-muted"> / {fmtNum(n(r.l3DoneTarget))}</span>}</td>
                  </tr>
                );
              })}
              {bdrs.length > 0 && (
                <tr className="bg-canvas/60 font-semibold">
                  <td className="py-2 pr-3">Team</td><td className="px-2 text-right tabular-nums">{tot(bdrs, 'calls')}</td>
                  <td className="px-2 text-right tabular-nums">{tot(bdrs, 'l1Booked')}</td>
                  <td className="px-2 tabular-nums">{tot(bdrs, 'l1Done')}{bdrs.some((r) => r.l1DoneTarget != null) && <span className="font-normal text-ink-muted"> / {fmtNum(tot(bdrs, 'l1DoneTarget'))}</span>}</td>
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

interface MyRow extends BdrRow { l2DoneTarget: number | null; l3DoneTarget: number | null; weekStart?: string; weekEnd?: string }
interface MyBoard { from: string; to: string; bucket: 'WEEK' | 'MONTH'; me: MyRow | null; weeks: MyRow[] }


function Goal({ label, done, target, hint }: { label: string; done: number; target: number | null; hint: string }) {
  const pct = target ? Math.round((100 * done) / target) : null;
  return (
    <div className="rounded-2xl border border-line/80 bg-canvas/50 p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-[26px] font-medium leading-none tabular-nums">
        {done}{target != null && <span className="text-[15px] text-ink-muted"> / {fmtNum(target)}</span>}
      </p>
      {pct != null ? (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-forest-50">
            <span className={cn('block h-full rounded-full', pct >= 100 ? 'bg-brand-mint' : 'bg-brand-forest')} style={{ width: `${Math.min(100, pct)}%` }} />
          </span>
          <span className={cn('text-xs font-semibold tabular-nums', pct >= 100 ? 'text-[#1A7F36]' : 'text-ink-soft')}>{pct}%</span>
        </div>
      ) : <p className="mt-2.5 text-xs text-ink-muted">No target set</p>}
      <p className="mt-1.5 text-[11px] text-ink-muted">{hint}</p>
    </div>
  );
}

/** A BDR's own numbers for the chosen period: L1 booked and L1/L2/L3 done against prorated targets, split by week (or month). */
export function MyScoreboard({ preset, bdrId }: { preset: Preset; bdrId?: string }) {
  const q = useQuery({
    queryKey: ['dashboard', 'my-scoreboard', preset, bdrId],
    queryFn: () => api.get<MyBoard>('/api/dashboards/bdr/scoreboard', { ...periodParams(preset), ...(bdrId ? { bdrId } : {}) }),
  });
  const me = q.data?.me;
  const t = (v: number | null | undefined) => (v == null ? null : n(v));
  const cell = (done: unknown, target: number | null | undefined) => (
    <td className="px-2 text-right tabular-nums">{n(done)}{target != null && <span className="text-ink-muted"> / {fmtNum(n(target))}</span>}</td>
  );

  return (
    <section className="rounded-[24px] border border-line/80 bg-white p-4 sm:p-5">
      <p className="flex items-center gap-2 font-display text-[18px] font-medium tracking-[-0.02em]"><Users className="h-4 w-4 text-brand-forest" />My numbers vs target</p>
      <p className="text-xs text-ink-muted">
        {preset.startsWith('custom:') || !q.data ? periodLabel(preset) : `${periodLabel(preset)} · ${fmtDay(q.data.from)} to ${fmtDay(q.data.to)}`} · targets are prorated to the days you picked
      </p>
      {q.isLoading && <p className="py-6 text-center text-xs text-ink-muted">Loading…</p>}
      {me && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Goal label="L1 booked" done={n(me.l1Booked)} target={t(me.l1BookedTarget)} hint="Meetings you set up, by booking date" />
            <Goal label="L1 done" done={n(me.l1Done)} target={t(me.l1DoneTarget)} hint="First meetings that happened" />
            <Goal label="L2 done" done={n(me.l2Done)} target={t(me.l2DoneTarget)} hint="On accounts you sourced" />
            <Goal label="L3 done" done={n(me.l3Done)} target={t(me.l3DoneTarget)} hint="On accounts you sourced" />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                <th className="py-2 pr-3 font-semibold">{q.data?.bucket === 'MONTH' ? 'Month' : 'Week'}</th>
                <th className="px-2 text-right font-semibold">Calls</th><th className="px-2 text-right font-semibold">L1 booked</th>
                <th className="px-2 text-right font-semibold">L1 done</th><th className="px-2 text-right font-semibold">L2 done</th><th className="px-2 text-right font-semibold">L3 done</th>
              </tr></thead>
              <tbody>
                {(q.data?.weeks ?? []).map((w) => (
                  <tr key={w.weekStart} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">
                      {q.data?.bucket === 'MONTH'
                        ? new Date(`${w.weekStart}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                        : `${fmtDay(w.weekStart!)} – ${fmtDay(w.weekEnd!)}`}
                    </td>
                    <td className="px-2 text-right tabular-nums">{n(w.calls)}</td>
                    {cell(w.l1Booked, w.l1BookedTarget)}{cell(w.l1Done, w.l1DoneTarget)}{cell(w.l2Done, w.l2DoneTarget)}{cell(w.l3Done, w.l3DoneTarget)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
