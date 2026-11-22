import { cn } from '@/lib/cn';

/**
 * Prosperr mark. This is a stand-in monogram in brand colours.
 * To use the official logo: put the file in src/assets/brand/ (e.g. prosperr-mark.svg),
 * import it here and render <img src={mark} alt="Prosperr" /> inside the same box.
 */
export function LogoMark({ size = 28, className, tone = 'forest' }: { size?: number; className?: string; tone?: 'forest' | 'light' }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.5, borderRadius: size * 0.28 }}
      className={cn('flex shrink-0 items-center justify-center font-bold',
        tone === 'forest' ? 'bg-brand-forest text-brand-lime' : 'bg-white text-brand-forest', className)}>
      P
    </span>
  );
}

export function Logo({ className, tone = 'forest', subtitle }: { className?: string; tone?: 'forest' | 'light'; subtitle?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={32} tone={tone} />
      <span className="leading-tight">
        <span className={cn('block text-[16px] font-semibold tracking-tight', tone === 'light' ? 'text-white' : 'text-ink')}>Prosperr</span>
        {subtitle && <span className={cn('block text-xs', tone === 'light' ? 'text-white/60' : 'text-ink-muted')}>{subtitle}</span>}
      </span>
    </span>
  );
}
