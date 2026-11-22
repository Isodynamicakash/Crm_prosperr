import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { TopoLines } from '@/components/brand/TopoLines';

// ---------------------------------------------------------------- Button

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-forest text-white hover:bg-brand-forest-700 shadow-[0_8px_20px_-10px_rgba(5,63,26,.8)] hover:shadow-[0_12px_28px_-10px_rgba(5,63,26,.75)]',
  secondary: 'bg-white text-ink border border-line hover:border-brand-forest/30 hover:bg-brand-forest-50/60',
  ghost: 'text-ink-soft hover:bg-black/[0.05] hover:text-ink',
  subtle: 'bg-brand-forest-50 text-brand-forest hover:bg-brand-forest/15',
  danger: 'bg-danger text-white hover:bg-danger/90',
};
const sizes: Record<Size, string> = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-9 px-4 text-[13px] gap-2', icon: 'h-9 w-9 justify-center' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} disabled={disabled || loading} data-variant={variant}
      className={cn('inline-flex select-none items-center rounded-full font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        variants[variant], sizes[size], className)} {...rest}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------- Inputs

const field = 'w-full rounded-xl border border-line bg-white px-3 text-[13.5px] text-ink placeholder:text-ink-muted/70 transition-all duration-200 hover:border-ink-muted/40 focus:border-brand-forest/50 focus:outline-none focus:ring-4 focus:ring-brand-forest/10 disabled:bg-canvas';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(field, 'h-9', className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(field, 'min-h-[72px] py-2 leading-5', className)} {...p} />;
});

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777F8C' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, style, ...p }, ref) {
  return (
    <select ref={ref} className={cn(field, 'h-9 cursor-pointer appearance-none pr-8', className)} style={{ backgroundImage: CHEVRON, backgroundSize: 12, backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat', ...style }} {...p}>
      {children}
    </select>
  );
});

export function Field({ label, hint, error, required, children, className }: {
  label: string; hint?: ReactNode; error?: string; required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="text-xs font-medium text-ink-soft">{label}{required && <span className="ml-0.5 text-danger">*</span>}</span>
      {children}
      {error ? <span className="block text-2xs text-danger">{error}</span> : hint ? <span className="block text-2xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('flex w-fit cursor-pointer items-center gap-2 text-[13px]', disabled && 'opacity-50')}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line text-accent accent-accent" />
      {label}
    </label>
  );
}

// ---------------------------------------------------------------- Surfaces

export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[22px] border border-line/80 bg-white shadow-[0_1px_2px_rgba(13,13,13,.04),0_12px_32px_-24px_rgba(13,13,13,.25)]', className)} {...p}>{children}</div>;
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div>
        <h3 className="font-display text-[16.5px] font-medium tracking-[-0.02em] text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export interface HeroStat { label: string; value: ReactNode; hint?: ReactNode; onClick?: () => void }

/**
 * Page hero: the dark contour surface from the landing page, with an optional eyebrow, icon, stats row and actions.
 * Buttons and segmented controls placed in `actions` restyle themselves for the dark surface (see .on-dark in index.css).
 */
export function PageHeader({ title, subtitle, actions, eyebrow, icon, stats, children }: {
  title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; icon?: ReactNode; stats?: HeroStat[]; children?: ReactNode;
}) {
  return (
    <section className="on-dark relative isolate mb-5 overflow-hidden rounded-[28px] bg-[#141614] px-5 py-5 text-paper sm:px-7 sm:py-6">
      <TopoLines levels={11} className="-z-10 opacity-70" />
      <div className="absolute -left-20 bottom-[-40%] -z-10 h-64 w-[460px] rounded-full bg-brand-mint/[0.14] blur-[100px]" />
      <div className="absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full bg-brand-mint/10 blur-[80px]" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {icon && <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-mint text-brand-night shadow-[0_0_26px_rgba(35,178,74,.45)] [&_svg]:h-5 [&_svg]:w-5">{icon}</span>}
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-mint">{eyebrow}</p>}
            <h1 className="font-display text-[28px] font-medium leading-tight tracking-[-0.04em] sm:text-[34px]">{title}</h1>
            {subtitle && <p className="mt-1 text-[13.5px] text-paper/55">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {!!stats?.length && (
        <div className={cn('mt-5 grid gap-3', stats.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
          {stats.map((st) => {
            const body = (
              <>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-paper/45">{st.label}</p>
                <p className="mt-1.5 font-display text-[26px] font-medium leading-none tracking-[-0.04em] tabular-nums">{st.value}</p>
                {st.hint && <p className="mt-1 text-[11.5px] text-paper/45">{st.hint}</p>}
              </>
            );
            const cls = 'rounded-[18px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left backdrop-blur transition-all duration-300';
            return st.onClick
              ? <button key={st.label} onClick={st.onClick} className={cn(cls, 'hover:-translate-y-0.5 hover:border-brand-mint/30 hover:bg-white/[0.07]')}>{body}</button>
              : <div key={st.label} className={cls}>{body}</div>;
          })}
        </div>
      )}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------- Small pieces

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
const tones: Record<Tone, string> = {
  neutral: 'bg-black/[0.05] text-ink-soft',
  accent: 'bg-brand-forest-50 text-brand-forest ring-1 ring-inset ring-brand-forest/10',
  success: 'bg-[#E6F5EA] text-[#1A7F36] ring-1 ring-inset ring-[#1A7F36]/15',
  warning: 'bg-warning-soft text-[#B07615]',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-brand-navy-50 text-brand-navy',
};

export function Badge({ tone = 'neutral', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-semibold', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

const avatarColors = ['bg-brand-forest-50 text-brand-forest', 'bg-brand-navy-50 text-brand-navy', 'bg-brand-forest text-white',
  'bg-[#E6F5EA] text-[#1A7F36]', 'bg-slate-100 text-slate-700', 'bg-brand-night text-brand-mint'];

export function Avatar({ name, size = 'sm', className }: { name?: string | null; size?: 'xs' | 'sm' | 'md'; className?: string }) {
  const h = [...(name ?? '?')].reduce((a, c) => a + c.charCodeAt(0), 0);
  const s = size === 'xs' ? 'h-5 w-5 text-[9px]' : size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  return (
    <span title={name ?? undefined} className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', avatarColors[h % avatarColors.length], s, className)}>
      {initials(name)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-black/[0.06]', className)} />;
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-forest text-white shadow-[0_10px_24px_-10px_rgba(5,63,26,.7)]">{icon}</div>}
      <p className="font-display text-[16px] font-medium tracking-[-0.02em] text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div data-segmented className="inline-flex rounded-full border border-line bg-white p-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} data-on={value === o.value || undefined}
          className={cn('h-7 rounded-full px-3 text-xs font-semibold text-ink-muted transition-all duration-200 hover:text-ink',
            value === o.value && 'bg-brand-forest text-white shadow-[0_6px_14px_-8px_rgba(5,63,26,.8)] hover:text-white')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: { value: T; label: ReactNode; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-white p-1">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={cn('flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-ink-muted transition-all duration-200 hover:text-ink',
            value === t.value && 'bg-brand-forest text-white shadow-[0_6px_14px_-8px_rgba(5,63,26,.8)] hover:text-white')}>
          {t.label}
          {t.count !== undefined && <span className={cn('rounded-full px-1.5 text-2xs', value === t.value ? 'bg-white/20 text-white' : 'bg-black/[0.05] text-ink-muted')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint, tone, onClick }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'danger' | 'warning' | 'success'; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={cn('group relative flex flex-col items-start justify-start overflow-hidden rounded-[20px] border border-line/80 bg-white p-4 text-left shadow-[0_1px_2px_rgba(13,13,13,.04)] transition-all duration-200', onClick && 'hover:-translate-y-0.5 hover:border-brand-forest/30 hover:shadow-[0_16px_32px_-20px_rgba(5,63,26,.45)]')}>
      <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-brand-forest to-brand-mint transition-transform duration-300 group-hover:scale-x-100" />
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={cn('mt-1.5 font-display text-[30px] font-medium leading-none tracking-[-0.04em] tabular-nums text-ink',
        tone === 'danger' && 'text-danger', tone === 'warning' && 'text-[#B07615]', tone === 'success' && 'text-success')}>{value}</p>
      {hint && <p className="mt-0.5 text-2xs text-ink-muted">{hint}</p>}
    </button>
  );
}

/** Lightweight tooltip (CSS only). Shows on hover and keyboard focus. */
export function Tooltip({ label, children, side = 'top' }: { label: ReactNode; children: ReactNode; side?: 'top' | 'bottom' }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span role="tooltip"
        className={cn('pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-brand-charcoal px-2 py-1 text-2xs font-medium text-white opacity-0 shadow-pop transition-all duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100',
          side === 'top' ? 'bottom-full mb-1.5 translate-y-1 group-hover/tt:translate-y-0' : 'top-full mt-1.5 -translate-y-1 group-hover/tt:translate-y-0')}>
        {label}
      </span>
    </span>
  );
}

/** A number that rolls when it changes (counters in headers, badges). */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('relative inline-flex overflow-hidden align-bottom tabular-nums', className)}>
      <span key={value} className="inline-block animate-[count-roll_260ms_cubic-bezier(.2,.8,.2,1)]">{value}</span>
    </span>
  );
}
