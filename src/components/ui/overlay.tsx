import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './ui';

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
}

/** Centered dialog for focused actions (log a call, submit SQL, confirm). */
export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; width?: string;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0D0D0D]/45 p-4 pt-[7vh] backdrop-blur-[6px] animate-fade-in" onMouseDown={onClose}>
      <div className={cn('relative w-full overflow-hidden rounded-[26px] border border-white/60 bg-white shadow-[0_40px_100px_-30px_rgba(0,0,0,.55)] animate-pop-in', width)} onMouseDown={(e) => e.stopPropagation()} role="dialog">
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-forest via-brand-mint to-brand-forest" />
        <div className="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-5">
          <div>
            <h2 className="font-display text-[19px] font-medium tracking-[-0.02em] text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line/70 bg-[#F7F8F7] px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Right-side panel: opens a record without leaving the list. */
export function Drawer({ open, onClose, children, width = 'max-w-[720px]' }: { open: boolean; onClose: () => void; children: ReactNode; width?: string }) {
  useEscape(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end bg-[#0D0D0D]/35 backdrop-blur-[4px] animate-fade-in" onMouseDown={onClose}>
      <div className={cn('h-full w-full overflow-y-auto rounded-l-[28px] border-l border-white/60 bg-canvas shadow-[-30px_0_80px_-30px_rgba(0,0,0,.5)] animate-slide-in scrollbar-thin', width)}
        onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Confirm({ open, onClose, onConfirm, title, body, confirmLabel = 'Confirm', danger, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; body?: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md"
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}>
      <div className="text-[13px] text-ink-soft">{body}</div>
    </Modal>
  );
}
