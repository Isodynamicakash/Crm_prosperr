import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/cn';

/** WhatsApp's glyph (simple single-path mark), in the current text colour. */
function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

/**
 * Opens a WhatsApp chat with this person (app on phone, WhatsApp Desktop or Web), with a short intro typed in,
 * then opens the CRM's call log so the conversation still lands in the pipeline. Calls are placed from WhatsApp itself.
 */
export function WhatsAppButton({ phone, name, onOpened, compact, className }: {
  phone: string; name?: string; onOpened?: () => void; compact?: boolean; className?: string;
}) {
  const t = useT();
  const { user } = useAuth();
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length < 10) return null;
  const first = (s?: string) => (s ?? '').trim().split(/\s+/)[0] ?? '';
  const text = t('whatsapp.greeting', { name: first(name), me: first(user?.fullName) });
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={() => onOpened?.()} title={`${t('whatsapp.open')} ${phone}`}
      className={cn('inline-flex items-center justify-center gap-1.5 rounded-full border border-[#1FA645]/30 bg-[#E6F5EA] font-semibold text-[#1A7F36] transition-colors hover:border-[#1FA645]/60 hover:bg-[#d7f0de]',
        compact ? 'h-8 w-8' : 'h-8 px-3 text-xs', className)}>
      <WaIcon className="h-4 w-4" />{!compact && <span>{t('whatsapp.open')}</span>}
    </a>
  );
}
