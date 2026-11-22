import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

// ---------------------------------------------------------------- Button

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-card',
  secondary: 'bg-white text-ink border border-line hover:bg-canvas shadow-card',
  ghost: 'text-ink-soft hover:bg-black/[0.04] hover:text-ink',
  subtle: 'bg-accent-soft text-accent hover:bg-accent/15',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-card',
};
const sizes: Record<Size, string> = { sm: 'h-7 px-2.5 text-xs gap-1.5', md: 'h-8 px-3 text-[13px] gap-2', icon: 'h-8 w-8 justify-center' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} disabled={disabled || loading}
      className={cn('inline-flex select-none items-center rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variants[variant], sizes[size], className)} {...rest}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------- Inputs

const field = 'w-full rounded-lg border border-line bg-white px-2.5 text-[13px] text-ink placeholder:text-ink-muted/70 transition-colors hover:border-ink-muted/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:bg-canvas';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(field, 'h-8', className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(field, 'min-h-[72px] py-2 leading-5', className)} {...p} />;
});

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777F8C' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, style, ...p }, ref) {
  return (
    <select ref={ref} className={cn(field, 'h-8 cursor-pointer appearance-none pr-7', className)} style={{ backgroundImage: CHEVRON, backgroundSize: 12, backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat', ...style }} {...p}>
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
  return <div className={cn('rounded-xl border border-line bg-white shadow-card', className)} {...p}>{children}</div>;
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-4 pt-4', className)}>
      <div>
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Small pieces

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
const tones: Record<Tone, string> = {
  neutral: 'bg-black/[0.05] text-ink-soft',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-[#B07615]',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-brand-navy-50 text-brand-navy',
};

export function Badge({ tone = 'neutral', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-2xs font-medium', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

const avatarColors = ['bg-brand-forest-50 text-brand-forest', 'bg-brand-navy-50 text-brand-navy', 'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700', 'bg-brand-lime-50 text-[#4D7A1C]', 'bg-slate-100 text-slate-700'];

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
      {icon && <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">{icon}</div>}
      <p className="text-[14px] font-semibold text-ink">{title}</p>
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
    <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn('h-7 rounded-md px-2.5 text-xs font-medium text-ink-muted transition-all',
            value === o.value && 'bg-white text-ink shadow-card')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: { value: T; label: ReactNode; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-4 border-b border-line">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={cn('-mb-px flex items-center gap-1.5 border-b-2 border-transparent pb-2 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink',
            value === t.value && 'border-accent text-ink')}>
          {t.label}
          {t.count !== undefined && <span className="rounded bg-black/[0.05] px-1 text-2xs text-ink-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint, tone, onClick }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'danger' | 'warning' | 'success'; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={cn('flex flex-col items-start justify-start rounded-xl border border-line bg-white p-4 text-left shadow-card transition-colors', onClick && 'hover:border-accent/40 hover:bg-accent-soft/30')}>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={cn('mt-1.5 text-[24px] font-semibold tracking-tight tabular-nums text-ink',
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
