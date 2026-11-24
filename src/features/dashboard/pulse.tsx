import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, CalendarCheck2, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, ClipboardCheck, PhoneCall, RefreshCw, Trophy, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { relTime } from '@/lib/format';
import { stageLabel } from '@/components/ui/status';
import type { LifecycleStage } from '@/lib/types';
import { TopoLines } from '@/components/brand/TopoLines';
import { AreaTrend, C, ChartCard, ComboBars, Donut, EmptyChart, HeatStrip, LiveBadge, Sparkline } from '@/components/charts/kit';
import { inr } from '@/lib/format';

/** A fixed period, or `custom:YYYY-MM-DD:YYYY-MM-DD` for any date range (both days included). */
export type Preset = '7' | '30' | 'month' | 'quarter' | `custom:${string}`;

/** Query parameters for a period: the preset name, or from/to for a custom range. */
export function periodParams(p: Preset): Record<string, string> {
  if (p.startsWith('custom:')) { const [, from, to] = p.split(':'); return { from, to }; }
  return { preset: p };
}
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
/** Last day of a month as YYYY-MM-DD (month is 1-12). */
const monthEnd = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
/** `custom:` range covering exactly one calendar month, else null. */
export function wholeMonth(p: Preset): { y: number; m: number } | null {
  if (!p.startsWith('custom:')) return null;
  const [, from, to] = p.split(':'); const y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7));
  return from.endsWith('-01') && to === monthEnd(y, m) ? { y, m } : null;
}
export function periodLabel(p: Preset) {
  if (!p.startsWith('custom:')) return PRESETS.find((x) => x.value === p)?.label ?? '';
  const wm = wholeMonth(p);
  if (wm) return new Date(wm.y, wm.m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const [, from, to] = p.split(':'); return `${fmtDay(from)} – ${fmtDay(to)}`;
}
export const PRESETS: { value: Preset; label: string }[] = [{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: 'month', label: 'This month' }, { value: 'quarter', label: 'Quarter' }];

export interface PulseDay { day: string; calls: number; connects: number; sqls: number; meetingsBooked: number; meetingsDone: number; wins: number; label: string }
export interface Pulse {
  generatedAt: string;
  series: PulseDay[];
  outcomeMix: { outcome: string; code: string; count: number; connect: boolean }[];
  stageMix: { stage: LifecycleStage; count: number; mrr: number }[];
  feed: { id: string; type: string; remarks?: string; occurredAt: string; by?: string; accountId: string; accountName: string; stakeholder?: string; outcome?: string }[];
}

const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Live pulse: refreshes every 30 s and whenever the tab regains focus. */
export function usePulse(preset: Preset) {
  return useQuery({
    queryKey: ['dashboard', 'pulse', preset],
    queryFn: async () => {
      const p = await api.get<Pulse>('/api/dashboards/pulse', periodParams(preset));
      return { ...p, series: p.series.map((d) => ({ ...d, calls: +d.calls, connects: +d.connects, sqls: +d.sqls, meetingsBooked: +d.meetingsBooked, meetingsDone: +d.meetingsDone, wins: +d.wins, label: dayLabel(d.day) })) };
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export const sum = (s: PulseDay[] | undefined, k: keyof PulseDay) => (s ?? []).reduce((a, d) => a + Number(d[k]), 0);

/** Change between the second and first half of the period, in %. */
export function delta(s: PulseDay[] | undefined, k: keyof PulseDay): number | null {
  if (!s || s.length < 4) return null;
  const h = Math.floor(s.length / 2);
  const a = sum(s.slice(0, h), k), b = sum(s.slice(s.length - h), k);
  if (a === 0) return b === 0 ? 0 : null;
  return Math.round((100 * (b - a)) / a);
}

// ---------------------------------------------------------------- hero

export interface HeroKpi { label: string; value: React.ReactNode; spark?: keyof PulseDay; delta?: number | null; hint?: string; to?: string }

export function CommandHero({ title, subtitle, preset, onPreset, kpis, pulse, updatedAt, fetching, onRefresh, children }: {
  title: string; subtitle: string; preset: Preset; onPreset: (p: Preset) => void; kpis: HeroKpi[];
  pulse?: PulseDay[]; updatedAt?: number; fetching?: boolean; onRefresh?: () => void; children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-[#141614] p-5 text-paper sm:p-7">
      <TopoLines levels={12} className="-z-10 opacity-70" />
      <div className="absolute -left-24 bottom-0 -z-10 h-72 w-[520px] rounded-full bg-brand-mint/[0.14] blur-[110px]" />
      <div className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-brand-mint/10 blur-[90px]" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><LiveBadge dark updatedAt={updatedAt} fetching={fetching} />
            {onRefresh && <button onClick={onRefresh} title="Refresh now" className="flex h-7 w-7 items-center justify-center rounded-full text-paper/50 transition-colors hover:bg-white/10 hover:text-paper"><RefreshCw className={cn('h-3.5 w-3.5', fetching && 'animate-spin')} /></button>}
          </div>
          <h1 className="mt-3 font-display text-[30px] font-medium leading-tight tracking-[-0.04em] sm:text-[38px]">{title}</h1>
          <p className="mt-1 text-[13.5px] text-paper/55">{subtitle}</p>
        </div>
        <PeriodPicker preset={preset} onPreset={onPreset} />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const body = (
            <>
              <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-paper/50">{k.label}</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <p className="font-display text-[30px] font-medium leading-none tracking-[-0.04em] tabular-nums sm:text-[34px]">{k.value}</p>
                {k.delta != null && (
                  <span className={cn('mb-0.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                    k.delta >= 0 ? 'bg-brand-mint/15 text-brand-mint' : 'bg-white/10 text-paper/70')}>
                    {k.delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(k.delta)}%
                  </span>
                )}
              </div>
              {k.hint && <p className="mt-1 text-[11.5px] text-paper/45">{k.hint}</p>}
              {k.spark && pulse && <div className="-mx-1 mt-3"><Sparkline data={pulse as unknown as Record<string, number>[]} k={k.spark} height={34} /></div>}
            </>
          );
          const cls = 'group relative block overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-mint/30 hover:bg-white/[0.07]';
          return k.to ? <Link key={k.label} to={k.to} className={cls}>{body}</Link> : <div key={k.label} className={cls}>{body}</div>;
        })}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------- cards

export function ActivityTrendCard({ s, mode = 'calls', className }: { s?: PulseDay[]; mode?: 'calls' | 'meetings' | 'team'; className?: string }) {
  const series = mode === 'meetings'
    ? [{ key: 'meetingsBooked', name: 'Meetings booked', color: C.navy }, { key: 'meetingsDone', name: 'Meetings done', color: C.mint }]
    : mode === 'team'
      ? [{ key: 'calls', name: 'Calls', color: C.forest }, { key: 'connects', name: 'Connects', color: C.mint }, { key: 'meetingsBooked', name: 'Meetings booked', color: C.navy }]
      : [{ key: 'calls', name: 'Calls', color: C.forest }, { key: 'connects', name: 'Connects', color: C.mint }];
  const total = (k: string) => sum(s, k as keyof PulseDay);
  return (
    <ChartCard className={className} title={mode === 'meetings' ? 'Meetings over time' : 'Activity over time'}
      subtitle="Daily, for the selected period"
      action={<div className="hidden gap-4 sm:flex">{series.map((x) => (
        <div key={x.key} className="text-right"><p className="flex items-center justify-end gap-1.5 text-[11px] text-ink-muted"><span className="h-2 w-2 rounded-full" style={{ background: x.color }} />{x.name}</p>
          <p className="font-display text-[18px] font-medium tabular-nums">{total(x.key)}</p></div>))}</div>}>
      {!s ? <div className="h-[260px] animate-pulse rounded-2xl bg-canvas" /> : <AreaTrend data={s as unknown as Record<string, number | string>[]} x="label" series={series} />}
    </ChartCard>
  );
}

export function OutcomeMixCard({ mix, className }: { mix?: Pulse['outcomeMix']; className?: string }) {
  const rows = (mix ?? []).map((m) => ({ outcome: m.outcome, count: Number(m.count), connect: m.connect }));
  const connects = rows.filter((r) => r.connect).reduce((a, r) => a + r.count, 0);
  const total = rows.reduce((a, r) => a + r.count, 0);
  return (
    <ChartCard className={className} title="Call outcomes" subtitle={total ? `${total} calls · ${Math.round((100 * connects) / total)}% reached the person` : 'What happened on each call'}>
      {!rows.length ? <EmptyChart>No calls logged in this period.</EmptyChart> : (
        <Donut height={200} center={`${Math.round((100 * connects) / Math.max(1, total))}%`} sub="connect rate"
          data={rows.slice(0, 7).map((r, i) => ({ name: r.outcome, value: r.count, color: r.connect ? [C.forest, C.mint, C.sage, C.forest2, C.pale][i % 5] : [C.slate, '#CBD5E1', C.navy][i % 3] }))} />
      )}
    </ChartCard>
  );
}

export function StageMixCard({ mix, title = 'Pipeline by stage', className }: { mix?: Pulse['stageMix']; title?: string; className?: string }) {
  const order: LifecycleStage[] = ['PROSPECT', 'SQL', 'L1', 'MULTITHREADING', 'L2', 'L3', 'NEGOTIATION', 'WON', 'LOST'];
  const rows = order.map((st) => mix?.find((m) => m.stage === st)).filter(Boolean).map((m) => ({
    stage: stageLabel[m!.stage] ?? m!.stage, accounts: Number(m!.count), mrr: Number(m!.mrr),
  }));
  return (
    <ChartCard className={className} title={title} subtitle="Active accounts (bars) and expected MRR (line) per stage">
      {!rows.length ? <EmptyChart /> : (
        <ComboBars data={rows} x="stage" bar={{ key: 'accounts', name: 'Accounts', color: C.forest }} line={{ key: 'mrr', name: 'Expected MRR', color: C.mint }} lineFmt={(v) => inr(v)} />
      )}
    </ChartCard>
  );
}

export function HeatmapCard({ s, k = 'calls', title = 'Daily activity', className }: { s?: PulseDay[]; k?: keyof PulseDay; title?: string; className?: string }) {
  const best = (s ?? []).reduce<PulseDay | null>((b, d) => (!b || Number(d[k]) > Number(b[k]) ? d : b), null);
  return (
    <ChartCard className={className} title={title} subtitle={best && Number(best[k]) > 0 ? `Busiest day: ${best.label} · ${best[k]}` : 'One square per day'}>
      {!s ? <div className="h-28 animate-pulse rounded-2xl bg-canvas" /> : (
        <div className="flex h-full flex-col justify-between gap-5">
          <HeatStrip days={s as unknown as Record<string, number | string>[]} k={k as string} label={(d) => String(d.label)} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[['Total', sum(s, k)], ['Daily average', (sum(s, k) / Math.max(1, s.length)).toFixed(1)],
              ['Active days', `${s.filter((d) => Number(d[k]) > 0).length}/${s.length}`], ['Best day', best ? Number(best[k]) : 0]].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl bg-canvas px-3 py-2.5">
                <p className="font-display text-[22px] font-medium leading-none tracking-[-0.03em] tabular-nums">{v}</p>
                <p className="mt-1 text-[11px] text-ink-muted">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

const feedIcon: Record<string, LucideIcon> = { CALL: PhoneCall, MEETING: CalendarCheck2, STATUS_CHANGE: ClipboardCheck };

export function LiveFeedCard({ feed, className }: { feed?: Pulse['feed']; className?: string }) {
  return (
    <ChartCard dark className={className} title="Live activity" subtitle="Newest first · refreshes every 30 s">
      {!feed?.length ? <p className="py-8 text-center text-xs text-paper/45">Nothing logged yet.</p> : (
        <ul className="-mr-2 max-h-[340px] space-y-2 overflow-y-auto pr-2 scrollbar-thin">
          {feed.slice(0, 14).map((f, i) => {
            const Icon = f.outcome?.includes('L1') ? Trophy : feedIcon[f.type] ?? ClipboardCheck;
            return (
              <li key={f.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-[page-in_.4s_both]">
                <Link to={`/accounts/${f.accountId}`} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-brand-mint/30 hover:bg-white/[0.06]">
                  <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', i === 0 ? 'bg-brand-mint text-brand-night shadow-[0_0_14px_rgba(35,178,74,.5)]' : 'bg-brand-mint/15 text-brand-mint')}><Icon className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-paper/90"><b className="font-semibold text-paper">{f.by ?? 'Someone'}</b> {f.type === 'CALL' ? 'called' : f.type === 'MEETING' ? 'updated a meeting with' : 'updated'} {f.stakeholder ?? f.accountName}</span>
                    <span className="block truncate text-[11px] text-paper/45">{f.accountName}{f.outcome ? ` · ${f.outcome}` : ''}</span>
                  </span>
                  <span className="shrink-0 text-[10.5px] text-paper/40">{relTime(f.occurredAt)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}

/** Fixed periods, a month picker, and "Custom": any from-to date range, applied to every number on the page. */
export function PeriodPicker({ preset, onPreset }: { preset: Preset; onPreset: (p: Preset) => void }) {
  const month = wholeMonth(preset);
  const custom = preset.startsWith('custom:') && !month;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const thisY = Number(today.slice(0, 4)), thisM = Number(today.slice(5, 7));
  const monthStart = `${today.slice(0, 8)}01`;
  const [open, setOpen] = useState<'month' | 'custom' | null>(null);
  const [year, setYear] = useState(month?.y ?? thisY);
  const [from, setFrom] = useState(custom ? preset.split(':')[1] : monthStart);
  const [to, setTo] = useState(custom ? preset.split(':')[2] : today);
  useEffect(() => { if (custom) { setFrom(preset.split(':')[1]); setTo(preset.split(':')[2]); } }, [preset, custom]);
  useEffect(() => { if (month) setYear(month.y); }, [month?.y]); // eslint-disable-line react-hooks/exhaustive-deps
  const valid = !!from && !!to && from <= to;
  const on = 'bg-brand-mint text-brand-night shadow-[0_0_18px_rgba(35,178,74,.45)]';
  const pickMonth = (m: number) => { onPreset(`custom:${year}-${String(m).padStart(2, '0')}-01:${monthEnd(year, m)}`); setOpen(null); };
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="inline-flex flex-wrap justify-end rounded-full border border-white/10 bg-white/[0.05] p-1 backdrop-blur">
        {PRESETS.map((o) => (
          <button key={o.value} onClick={() => { setOpen(null); onPreset(o.value); }}
            className={cn('h-8 rounded-full px-3.5 text-xs font-semibold transition-all duration-200',
              preset === o.value ? on : 'text-paper/60 hover:text-paper')}>{o.label}</button>
        ))}
        <button onClick={() => setOpen((v) => (v === 'month' ? null : 'month'))} aria-expanded={open === 'month'}
          className={cn('flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all duration-200',
            month ? on : 'text-paper/60 hover:text-paper')}>
          <CalendarDays className="h-3.5 w-3.5" />{month ? periodLabel(preset) : 'Month'}
        </button>
        <button onClick={() => setOpen((v) => (v === 'custom' ? null : 'custom'))} aria-expanded={open === 'custom'}
          className={cn('flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all duration-200',
            custom ? on : 'text-paper/60 hover:text-paper')}>
          <CalendarRange className="h-3.5 w-3.5" />{custom ? periodLabel(preset) : 'Custom'}
        </button>
      </div>
      {open === 'month' && (
        <div className="w-[264px] rounded-2xl border border-white/10 bg-[#101311]/90 p-2.5 backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <button onClick={() => setYear((y) => y - 1)} aria-label="Previous year" className="grid h-7 w-7 place-items-center rounded-full text-paper/70 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-xs font-semibold text-paper">{year}</span>
            <button onClick={() => setYear((y) => y + 1)} disabled={year >= thisY} aria-label="Next year" className="grid h-7 w-7 place-items-center rounded-full text-paper/70 hover:bg-white/10 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const future = year > thisY || (year === thisY && m > thisM);
              const sel = month?.y === year && month?.m === m;
              return (
                <button key={m} disabled={future} onClick={() => pickMonth(m)}
                  className={cn('h-8 rounded-lg text-xs font-semibold transition-colors disabled:opacity-25',
                    sel ? 'bg-brand-mint text-brand-night' : year === thisY && m === thisM ? 'border border-brand-mint/50 text-paper hover:bg-white/10' : 'text-paper/75 hover:bg-white/10')}>
                  {new Date(2000, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' })}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {open === 'custom' && (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-white/10 bg-[#101311]/90 p-2.5 backdrop-blur">
          <label className="text-[11px] text-paper/60">From
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block h-8 rounded-lg border border-white/15 bg-white/[0.06] px-2 text-xs text-paper [color-scheme:dark]" /></label>
          <label className="text-[11px] text-paper/60">To
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
              className="mt-1 block h-8 rounded-lg border border-white/15 bg-white/[0.06] px-2 text-xs text-paper [color-scheme:dark]" /></label>
          <button disabled={!valid} onClick={() => { onPreset(`custom:${from}:${to}`); setOpen(null); }}
            className="h-8 rounded-full bg-brand-mint px-4 text-xs font-bold text-brand-night disabled:opacity-40">Apply</button>
        </div>
      )}
    </div>
  );
}
