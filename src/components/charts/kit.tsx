import { useEffect, useId, useState, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { cn } from '@/lib/cn';
import { TopoLines } from '@/components/brand/TopoLines';

/*
 * One chart language for the whole app: forest / mint greens with navy and slate as quiet secondaries,
 * soft gradients, hairline grids, a dark glass tooltip. Every chart here renders real API data.
 */
export const C = {
  forest: '#053F1A', forest2: '#0E5A2A', mint: '#23B24A', sage: '#7CCB8E', pale: '#CDEBD5',
  navy: '#202E64', slate: '#94A3B8', line: '#E7E8EA', ink: '#6B706D', amber: '#C98A1B',
};
export const SERIES = [C.forest, C.mint, C.navy, C.sage, C.slate, C.forest2, C.pale];

const axis = { tickLine: false, axisLine: false, fontSize: 11, stroke: C.ink } as const;

// ---------------------------------------------------------------- surfaces

export function ChartCard({ title, subtitle, action, children, className, dark }: {
  title: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; dark?: boolean;
}) {
  return (
    <section className={cn('relative isolate flex flex-col overflow-hidden rounded-[24px] border p-5',
      dark ? 'border-white/[0.06] bg-[#141614] text-paper' : 'border-line/80 bg-white shadow-[0_1px_2px_rgba(13,13,13,.04),0_12px_32px_-24px_rgba(13,13,13,.25)]', className)}>
      {dark && <><TopoLines levels={9} className="-z-10 opacity-60" /><div className="absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-brand-mint/15 blur-3xl" /></>}
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className={cn('font-display text-[16.5px] font-medium tracking-[-0.02em]', dark ? 'text-paper' : 'text-ink')}>{title}</h3>
          {subtitle && <p className={cn('mt-0.5 text-xs', dark ? 'text-paper/50' : 'text-ink-muted')}>{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function GlassTooltip({ active, payload, label, fmt }: TooltipProps<number, string> & { fmt?: (v: number, name: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[140px] rounded-xl border border-white/10 bg-[#101311]/95 px-3 py-2.5 text-[12px] text-paper shadow-[0_16px_40px_-12px_rgba(0,0,0,.6)] backdrop-blur">
      {label != null && <p className="mb-1.5 text-[11px] font-medium text-paper/55">{label}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-paper/75"><span className="h-2 w-2 rounded-full" style={{ background: p.color ?? (p.payload as { fill?: string })?.fill }} />{p.name}</span>
          <span className="font-semibold tabular-nums">{fmt ? fmt(Number(p.value), String(p.name)) : Number(p.value).toLocaleString('en-IN')}</span>
        </p>
      ))}
    </div>
  );
}

/** "Live · updated 12s ago", ticking. */
export function LiveBadge({ updatedAt, fetching, dark }: { updatedAt?: number; fetching?: boolean; dark?: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick((x) => x + 1), 1000); return () => window.clearInterval(t); }, []);
  const s = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt) / 1000)) : null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
      dark ? 'bg-brand-mint/15 text-brand-mint' : 'bg-brand-forest-50 text-brand-forest')}>
      <span className="relative flex h-1.5 w-1.5"><span className={cn('absolute h-full w-full rounded-full bg-brand-mint', fetching ? 'animate-ping' : 'motion-safe:animate-ping opacity-60')} /><span className="relative h-1.5 w-1.5 rounded-full bg-brand-mint" /></span>
      Live{s != null && <span className="font-normal opacity-70">· {s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`}</span>}
    </span>
  );
}

export function EmptyChart({ children = 'No data in this period yet.' }: { children?: ReactNode }) {
  return <div className="flex h-full min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-line text-xs text-ink-muted">{children}</div>;
}

// ---------------------------------------------------------------- charts

export function Sparkline({ data, k, color = C.mint, height = 36 }: { data: Record<string, number | string>[]; k: string; color?: string; height?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs><linearGradient id={`sp${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity={0.45} /><stop offset="1" stopColor={color} stopOpacity={0} /></linearGradient></defs>
          <Area type="monotone" dataKey={k} stroke={color} strokeWidth={2} fill={`url(#sp${id})`} dot={false} isAnimationActive animationDuration={900} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaTrend({ data, x, series, height = 260, bars }: {
  data: Record<string, number | string>[]; x: string; height?: number;
  series: { key: string; name: string; color: string }[];
  bars?: { key: string; name: string; color: string }[];
}) {
  const id = useId().replace(/:/g, '');
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -12 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`ar${id}${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity={0.32} /><stop offset="1" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke={C.line} strokeDasharray="3 6" />
          <XAxis dataKey={x} {...axis} minTickGap={24} />
          <YAxis {...axis} allowDecimals={false} width={40} />
          <Tooltip content={<GlassTooltip />} cursor={{ stroke: C.forest, strokeOpacity: 0.15, strokeWidth: 28 }} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.2} fill={`url(#ar${id}${s.key})`}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#fff' }} animationDuration={1000} />
          ))}
          {bars?.map((b) => <Line key={b.key} type="monotone" dataKey={b.key} name={b.name} stroke={b.color} strokeWidth={0} dot={{ r: 3, fill: b.color }} />)}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupedBars({ data, x, series, height = 240, stacked, horizontal, fmt }: {
  data: Record<string, number | string>[]; x: string; height?: number; stacked?: boolean; horizontal?: boolean;
  series: { key: string; name: string; color: string }[]; fmt?: (v: number, name: string) => string;
}) {
  const r = 7;
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 6, right: 8, bottom: 0, left: horizontal ? 4 : -12 }} barCategoryGap="22%">
          <CartesianGrid vertical={horizontal} horizontal={!horizontal} stroke={C.line} strokeDasharray="3 6" />
          {horizontal ? <>
            <XAxis type="number" {...axis} allowDecimals={false} />
            <YAxis type="category" dataKey={x} {...axis} width={104} />
          </> : <>
            <XAxis dataKey={x} {...axis} />
            <YAxis {...axis} allowDecimals={false} width={40} />
          </>}
          <Tooltip content={<GlassTooltip fmt={fmt} />} cursor={{ fill: 'rgba(5,63,26,0.05)' }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId={stacked ? 'a' : undefined} maxBarSize={horizontal ? 18 : 34}
              radius={stacked ? (i === series.length - 1 ? (horizontal ? [0, r, r, 0] : [r, r, 0, 0]) : 0) : (horizontal ? [0, r, r, 0] : [r, r, 0, 0])}
              animationDuration={900} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Bars on the left axis plus a line on its own right axis (e.g. account count vs MRR). */
export function ComboBars({ data, x, bar, line, height = 250, lineFmt }: {
  data: Record<string, number | string>[]; x: string; height?: number;
  bar: { key: string; name: string; color: string }; line: { key: string; name: string; color: string }; lineFmt?: (v: number) => string;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -12 }}>
          <defs><linearGradient id={`cb${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={bar.color} /><stop offset="1" stopColor={C.forest2} stopOpacity={0.75} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke={C.line} strokeDasharray="3 6" />
          <XAxis dataKey={x} {...axis} />
          <YAxis yAxisId="l" {...axis} allowDecimals={false} width={40} />
          <YAxis yAxisId="r" orientation="right" {...axis} width={52} tickFormatter={(v) => (lineFmt ? lineFmt(Number(v)) : String(v))} />
          <Tooltip content={<GlassTooltip fmt={(v, n) => (n === line.name && lineFmt ? lineFmt(v) : v.toLocaleString('en-IN'))} />} cursor={{ fill: 'rgba(5,63,26,0.05)' }} />
          <Bar yAxisId="l" dataKey={bar.key} name={bar.name} fill={`url(#cb${id})`} radius={[8, 8, 0, 0]} maxBarSize={38} animationDuration={900} />
          <Line yAxisId="r" type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2.5}
            dot={{ r: 3.5, fill: '#fff', stroke: line.color, strokeWidth: 2 }} activeDot={{ r: 5 }} animationDuration={1100} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data, center, sub, height = 220, fmt }: {
  data: { name: string; value: number; color?: string }[]; center?: ReactNode; sub?: ReactNode; height?: number; fmt?: (v: number) => string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative" style={{ height }}>
        <ResponsiveContainer>
          <PieChart>
            <Tooltip content={<GlassTooltip fmt={fmt ? (v) => fmt(v) : undefined} />} />
            <Pie data={total ? data : [{ name: 'None', value: 1 }]} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="96%" paddingAngle={total ? 2.5 : 0}
              cornerRadius={6} stroke="none" animationDuration={900}>
              {(total ? data : [{ name: 'None', value: 1 }]).map((d, i) => <Cell key={i} fill={total ? (d as { color?: string }).color ?? SERIES[i % SERIES.length] : C.line} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-[26px] font-medium leading-none tracking-[-0.04em] text-ink">{center ?? total}</span>
          {sub && <span className="mt-1 text-[11px] text-ink-muted">{sub}</span>}
        </div>
      </div>
      <ul className="space-y-1.5">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-[12.5px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color ?? SERIES[i % SERIES.length] }} />
            <span className="min-w-0 flex-1 truncate text-ink-soft">{d.name}</span>
            <span className="font-semibold tabular-nums">{fmt ? fmt(d.value) : d.value}</span>
            <span className="w-9 text-right text-[11px] tabular-nums text-ink-muted">{total ? Math.round((100 * d.value) / total) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RadialGauge({ value, label, sub, size = 132, color = C.mint }: { value: number; label: ReactNode; sub?: ReactNode; size?: number; color?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer>
          <RadialBarChart innerRadius="78%" outerRadius="100%" data={[{ v }]} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="v" cornerRadius={20} fill={color} background={{ fill: '#EEF0EE' }} animationDuration={1100} />
          </RadialBarChart>
        </ResponsiveContainer>
        <span className="absolute inset-0 flex items-center justify-center font-display text-[24px] font-medium tracking-[-0.04em]">{Math.round(v)}%</span>
      </div>
      <p className="mt-2 text-[13px] font-medium text-ink">{label}</p>
      {sub && <p className="text-[11.5px] text-ink-muted">{sub}</p>}
    </div>
  );
}

/** Tapered funnel with conversion chips between steps. */
export function Funnel({ steps }: { steps: { stage: string; count: number; pct?: number | null }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.count));
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => {
        const w = Math.max(14, (100 * s.count) / max);
        return (
          <div key={s.stage} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-[12px] font-medium text-ink-soft">{s.stage}</span>
            <div className="relative h-9 flex-1">
              <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-[10px] text-[12.5px] font-semibold text-white transition-[width] duration-700"
                style={{ width: `${w}%`, background: `linear-gradient(90deg, ${C.forest}, ${i > 2 ? C.mint : C.forest2})`, opacity: 1 - i * 0.07 }}>
                {s.count}
              </div>
            </div>
            <span className={cn('w-14 shrink-0 text-right text-[11px] font-semibold tabular-nums', s.pct == null ? 'text-transparent' : 'text-brand-forest')}>{s.pct != null ? `${s.pct}%` : '·'}</span>
          </div>
        );
      })}
    </div>
  );
}

/** One square per day, darker green = more activity. */
export function HeatStrip({ days, k, label }: { days: Record<string, number | string>[]; k: string; label: (d: Record<string, number | string>) => string }) {
  const max = Math.max(1, ...days.map((d) => Number(d[k])));
  return (
    <div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(15, Math.max(7, days.length))}, minmax(0, 1fr))` }}>
        {days.map((d, i) => {
          const v = Number(d[k]); const t = v / max;
          return (
            <span key={i} title={`${label(d)} · ${v}`} className="aspect-square max-h-14 rounded-[7px] transition-transform hover:scale-110"
              style={{ background: v === 0 ? '#EEF0EE' : `rgba(${t > 0.6 ? '5,63,26' : '35,178,74'},${0.25 + t * 0.75})` }} />
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10.5px] text-ink-muted">
        Less {[0.15, 0.35, 0.6, 0.85, 1].map((t) => <span key={t} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: `rgba(${t > 0.6 ? '5,63,26' : '35,178,74'},${0.25 + t * 0.75})` }} />)} More
      </div>
    </div>
  );
}

/** Thin progress meter for lists (targets, MRR by temperature, hygiene). */
export function Meter({ value, max, color = C.forest }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#EEF0EE]">
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${max ? Math.min(100, (100 * value) / max) : 0}%`, background: `linear-gradient(90deg, ${color}, ${C.mint})` }} />
    </div>
  );
}
