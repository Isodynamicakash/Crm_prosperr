import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import { ArrowRight, Building2, Search, User } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { humanize } from '@/lib/format';
import { navFor } from './nav';

interface SearchResult {
  accounts: { id: string; name: string; domain?: string; stage: string; status: string }[];
  stakeholders: { id: string; name: string; designation?: string; accountId: string; accountName: string }[];
}

function useDebounced<T>(v: T, ms = 200) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

/** Ctrl/Cmd+K: search accounts, people, emails, phones and LinkedIn, or jump to any page. */
export function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim());
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isFetching } = useQuery({
    queryKey: ['search', term], queryFn: () => api.get<SearchResult>('/api/search', { q: term }), enabled: open && term.length >= 2,
  });

  useEffect(() => { if (!open) setQ(''); }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  const go = (to: string) => { onClose(); navigate(to); };
  const pages = navFor(user?.role);

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center bg-ink/25 pt-[12vh] animate-fade-in" onMouseDown={onClose}>
      <div className="h-fit w-full max-w-[620px] overflow-hidden rounded-xl border border-line bg-white shadow-pop animate-pop-in" onMouseDown={(e) => e.stopPropagation()}>
        <Command shouldFilter={false} loop>
          <div className="flex items-center gap-2.5 border-b border-line px-4">
            <Search className="h-4 w-4 text-ink-muted" />
            <Command.Input autoFocus value={q} onValueChange={setQ} placeholder="Search company, person, email, phone, LinkedIn… or type a page"
              className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-muted/70 focus-visible:ring-0 focus-visible:ring-offset-0" />
            {isFetching && <span className="text-2xs text-ink-muted">Searching…</span>}
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2 scrollbar-thin">
            {term.length >= 2 && !isFetching && !data?.accounts.length && !data?.stakeholders.length && (
              <Command.Empty className="py-8 text-center text-xs text-ink-muted">No matches for “{term}”.</Command.Empty>
            )}
            {!!data?.accounts.length && (
              <Command.Group heading="Accounts" className="cmd-group">
                {data.accounts.map((a) => (
                  <Item key={a.id} onSelect={() => go(`/accounts/${a.id}`)} icon={<Building2 className="h-4 w-4" />}
                    title={a.name} meta={`${a.domain ?? ''} · ${humanize(a.stage)}${a.status === 'INACTIVE' ? ' · Inactive' : ''}`} />
                ))}
              </Command.Group>
            )}
            {!!data?.stakeholders.length && (
              <Command.Group heading="People" className="cmd-group">
                {data.stakeholders.map((s) => (
                  <Item key={s.id} onSelect={() => go(`/accounts/${s.accountId}?stakeholder=${s.id}`)} icon={<User className="h-4 w-4" />}
                    title={s.name} meta={`${s.designation ?? ''} · ${s.accountName}`} />
                ))}
              </Command.Group>
            )}
            {pages.some((p) => !q || p.label.toLowerCase().includes(q.toLowerCase())) && <Command.Group heading="Go to" className="cmd-group">
              {pages.filter((p) => !q || p.label.toLowerCase().includes(q.toLowerCase())).map((p) => (
                <Item key={p.to} onSelect={() => go(p.to)} icon={<p.icon className="h-4 w-4" />} title={p.label}
                  meta={p.shortcut ? `G then ${p.shortcut.toUpperCase()}` : ''} />
              ))}
            </Command.Group>}
          </Command.List>
          <div className="flex items-center gap-4 border-t border-line bg-canvas/60 px-4 py-2 text-2xs text-ink-muted">
            <span><span className="kbd">↑↓</span> navigate</span><span><span className="kbd">Enter</span> open</span><span><span className="kbd">Esc</span> close</span>
          </div>
        </Command>
      </div>
    </div>,
    document.body,
  );
}

function Item({ onSelect, icon, title, meta }: { onSelect: () => void; icon: React.ReactNode; title: string; meta?: string }) {
  return (
    <Command.Item onSelect={onSelect}
      className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-ink data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent">
      <span className="text-ink-muted group-data-[selected=true]:text-accent">{icon}</span>
      <span className="flex-1 truncate font-medium">{title}</span>
      {meta && <span className="truncate text-2xs text-ink-muted">{meta}</span>}
      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-data-[selected=true]:opacity-100" />
    </Command.Item>
  );
}
