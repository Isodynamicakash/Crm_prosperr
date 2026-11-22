import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ChevronsLeft, ChevronsRight, LogOut, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LogoMark } from '@/components/brand/Logo';
import { TopoLines } from '@/components/brand/TopoLines';
import { cn } from '@/lib/cn';
import { humanize, relTime } from '@/lib/format';
import type { NotificationRow } from '@/lib/types';
import { Avatar, Button } from '@/components/ui/ui';
import { CommandMenu } from './CommandMenu';
import { navFor } from './nav';

const COLLAPSE_KEY = 'prosperr.sidebar';

export function AppShell() {
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } });
  const [cmdOpen, setCmdOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const items = navFor(user?.role);

  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ } }, [collapsed]);

  // Cmd/Ctrl+K opens search; "g" then a letter jumps to a page (g d = My Day, g a = Accounts ...).
  useEffect(() => {
    let pendingG = false;
    let timer: number | undefined;
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen((o) => !o); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); setCmdOpen(true); return; }
      if (e.key === '[') { setCollapsed((c) => !c); return; }
      if (pendingG) {
        const hit = items.find((n) => n.shortcut === e.key.toLowerCase());
        pendingG = false;
        if (hit) navigate(hit.to);
        return;
      }
      if (e.key === 'g') { pendingG = true; window.clearTimeout(timer); timer = window.setTimeout(() => (pendingG = false), 800); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, navigate]);

  const main = items.filter((i) => i.group === 'main');
  const workspace = items.filter((i) => i.group === 'workspace');

  return (
    <div className="flex h-full">
      <aside className={cn('relative isolate flex shrink-0 flex-col overflow-hidden bg-[#141614] text-paper transition-[width] duration-200', collapsed ? 'w-[60px]' : 'w-[240px]')}>
        <TopoLines levels={9} className="-z-10 opacity-60" />
        <div aria-hidden className="absolute -left-16 bottom-10 -z-10 h-56 w-56 rounded-full bg-brand-mint/15 blur-3xl" />
        <div className={cn('flex h-16 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
          <LogoMark size={30} tone="light" />
          {!collapsed && <div className="min-w-0 leading-none"><p className="font-display text-[17px] font-extrabold uppercase tracking-[-0.01em] text-white">Prosperr.io</p><p className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-brand-mint">Sales CRM</p></div>}
        </div>

        <button onClick={() => setCmdOpen(true)}
          className={cn('mx-3 mb-3 flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs text-paper/55 transition-colors hover:border-white/20 hover:text-paper',
            collapsed && 'mx-auto w-9 justify-center px-0')} title="Search (Ctrl K)">
          <Search className="h-3.5 w-3.5" />
          {!collapsed && <><span className="flex-1 text-left">Search…</span><kbd className="rounded-md border border-white/10 px-1.5 text-2xs text-paper/50">Ctrl K</kbd></>}
        </button>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 scrollbar-thin">
          {main.map((n) => <NavItemLink key={n.to} item={n} collapsed={collapsed} />)}
          {workspace.length > 0 && (
            <>
              {!collapsed ? <p className="px-2.5 pb-1 pt-5 text-2xs font-semibold uppercase tracking-[0.16em] text-paper/35">Workspace</p> : <div className="my-3 border-t border-white/10" />}
              {workspace.map((n) => <NavItemLink key={n.to} item={n} collapsed={collapsed} />)}
            </>
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className={cn('flex items-center gap-2.5', collapsed && 'flex-col')}>
            <Avatar name={user?.fullName} size="md" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-paper">{user?.fullName}</p>
                <p className="text-2xs text-brand-mint">{humanize(user?.role)}</p>
              </div>
            )}
            <button onClick={signOut} title="Sign out" className="flex h-9 w-9 items-center justify-center rounded-full text-paper/60 transition-colors hover:bg-white/10 hover:text-paper"><LogOut className="h-4 w-4" /></button>
          </div>
          <button onClick={() => setCollapsed((c) => !c)} title="Collapse sidebar ( [ )"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1 text-2xs text-paper/40 hover:bg-white/[0.06] hover:text-paper">
            {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <><ChevronsLeft className="h-3.5 w-3.5" />Collapse</>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="app-main min-h-0 flex-1 overflow-y-auto bg-canvas scrollbar-thin">
          <div key={location.pathname} className="mx-auto max-w-[1360px] animate-[page-in_.35s_cubic-bezier(.16,1,.3,1)] px-4 py-6 sm:px-6"><Outlet /></div>
        </main>
      </div>
      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}

function NavItemLink({ item, collapsed }: { item: ReturnType<typeof navFor>[number]; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.to === '/'} title={collapsed ? item.label : undefined}
      className={({ isActive }) => cn('group relative flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13.5px] font-medium text-paper/60 transition-all duration-200 hover:bg-white/[0.06] hover:text-paper',
        isActive && 'bg-brand-mint/[0.14] text-paper ring-1 ring-brand-mint/25 hover:bg-brand-mint/[0.18] [&_svg]:text-brand-mint before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-brand-mint before:shadow-[0_0_10px_rgba(35,178,74,.8)]', collapsed && 'justify-center px-0')}>
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {!collapsed && item.shortcut && <span className="kbd-hint hidden text-2xs text-paper/35 group-hover:inline">G {item.shortcut.toUpperCase()}</span>}
    </NavLink>
  );
}

function TopBar() {
  const { pathname } = useLocation();
  const crumbs = pathname.split('/').filter(Boolean);
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line/70 bg-canvas/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-1.5 text-[13px] text-ink-muted">
        <span className="font-display font-semibold text-ink">Prosperr</span>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="text-line">/</span>
            <span className={cn(i === crumbs.length - 1 && 'rounded-full bg-white px-2.5 py-0.5 font-medium text-ink ring-1 ring-line')}>{i > 0 && crumbs[i - 1] === 'accounts' ? 'Account' : humanize(c.replace('-', '_'))}</span>
          </span>
        ))}
      </div>
      <Notifications />
    </header>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data = [] } = useQuery({
    queryKey: ['notifications'], queryFn: () => api.get<NotificationRow[]>('/api/notifications'), refetchInterval: 60_000,
  });
  const unread = data.filter((n) => !n.readAt).length;

  const openOne = async (n: NotificationRow) => {
    if (!n.readAt) await api.post(`/api/notifications/${n.id}/read`).catch(() => undefined);
    qc.invalidateQueries({ queryKey: ['notifications'] });
    setOpen(false);
    if (n.entityType?.toLowerCase().includes('account') && n.entityId) navigate(`/accounts/${n.entityId}`);
    else if (n.entityType?.toLowerCase().includes('sql')) navigate('/sql');
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-white">{unread > 9 ? '9+' : unread}</span>}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-40 w-[360px] overflow-hidden rounded-xl border border-line bg-white shadow-pop animate-pop-in">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <p className="text-[13px] font-semibold">Notifications</p>
              {unread > 0 && <button className="text-xs text-accent hover:underline" onClick={async () => { await api.post('/api/notifications/read-all'); qc.invalidateQueries({ queryKey: ['notifications'] }); }}>Mark all read</button>}
            </div>
            <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
              {data.length === 0 && <p className="px-4 py-10 text-center text-xs text-ink-muted">You’re all caught up.</p>}
              {data.slice(0, 30).map((n) => (
                <button key={n.id} onClick={() => openOne(n)} className="flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left last:border-0 hover:bg-canvas">
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-accent')} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-xs text-ink-muted line-clamp-2">{n.body}</span>}
                    <span className="mt-1 block text-2xs text-ink-muted">{relTime(n.createdAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
