import { cn } from '@/lib/cn';
import mark from '@/assets/brand/prosperr-mark.png';

/**
 * Official Prosperr mark (from prosperr.io) + the PROSPERR.IO wordmark set in the site's display face.
 * Every screen renders the brand through these two components.
 */
export function LogoMark({ size = 28, className, tone = 'forest', spin = false }: { size?: number; className?: string; tone?: 'forest' | 'light'; spin?: boolean }) {
  return (
    <span aria-hidden style={{ width: size, height: size, padding: tone === 'light' ? Math.round(size * 0.12) : 0 }}
      className={cn('relative flex shrink-0 items-center justify-center rounded-full',
        tone === 'light' && 'bg-white/95', className)}>
      <img src={mark} alt="" draggable={false}
        className={cn('h-full w-full select-none object-contain', spin && 'transition-transform duration-700 ease-out group-hover:rotate-[360deg]')} />
    </span>
  );
}

export function Logo({ className, tone = 'forest', subtitle, size = 'md' }: { className?: string; tone?: 'forest' | 'light'; subtitle?: string; size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'lg' ? 40 : size === 'sm' ? 26 : 32;
  return (
    <span className={cn('group flex items-center gap-2.5', className)}>
      <LogoMark size={px} tone={tone} />
      <span className="leading-none">
        <span className={cn('block font-display font-extrabold uppercase tracking-[-0.01em]',
          size === 'lg' ? 'text-[26px]' : size === 'sm' ? 'text-[17px]' : 'text-[21px]',
          tone === 'light' ? 'text-white' : 'text-brand-navy')}>
          Prosperr<span className={tone === 'light' ? 'text-white' : 'text-brand-navy'}>.io</span>
        </span>
        {subtitle && <span className={cn('mt-1 block text-[10.5px] font-semibold uppercase tracking-[0.22em]', tone === 'light' ? 'text-paper/55' : 'text-ink-muted')}>{subtitle}</span>}
      </span>
    </span>
  );
}
