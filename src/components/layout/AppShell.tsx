import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Building2, CalendarClock, CheckSquare, ChevronsLeft, ChevronsRight, ClipboardCheck, Languages, LogOut, Menu, Search, UserPlus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LogoMark } from '@/components/brand/Logo';
import { TopoLines } from '@/components/brand/TopoLines';
import { cn } from '@/lib/cn';
import { humanize, relTime } from '@/lib/format';
import type { NotificationRow } from '@/lib/types';
import { Avatar } from '@/components/ui/ui';
import { CommandMenu } from './CommandMenu';
import { AskProsperr } from '@/features/help/AskProsperr';
import { navFor } from './nav';
import { LANGUAGES, useLanguage, useT, type LangCode } from '@/lib/i18n';
import { GoogleConnect } from '@/features/integrations/Google';

const COLLAPSE_KEY = 'prosperr.sidebar';

export function AppShell() {
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } });
  const [cmdOpen, setCmdOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const items = navFor(user?.role).map((n) => ({ ...n, label: t(`nav.${n.to}`, undefined, n.label) }));

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
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => {
    if (!drawer) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [drawer]);

  const sidebar = (c: boolean, mobile = false) => (
    <>
      <TopoLines levels={9} className="-z-10 opacity-60" />
      <div aria-hidden className="absolute -left-16 bottom-10 -z-10 h-56 w-56 rounded-full bg-brand-mint/15 blur-3xl" />
      <div className={cn('flex h-16 items-center gap-2.5 px-4', c && 'justify-center px-0')}>
        <LogoMark size={30} tone="light" />
        {!c && <div className="min-w-0 flex-1 leading-none"><p className="font-display text-[17px] font-extrabold uppercase tracking-[-0.01em] text-white">Prosperr.io</p><p className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-brand-mint">Sales CRM</p></div>}
        {mobile && <button onClick={() => setDrawer(false)} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-paper/70 hover:text-paper"><X className="h-4 w-4" /></button>}
      </div>

      <button onClick={() => { setDrawer(false); setCmdOpen(true); }}
        className={cn('mx-3 mb-3 flex h-10 items-center gap-2 rounded-xl border border-brand-mint/20 bg-brand-mint/[0.08] px-3 text-[12.5px] font-medium text-paper/70 transition-colors hover:border-brand-mint/40 hover:text-paper',
          c && 'mx-auto w-9 justify-center px-0')} title={t('nav.search')}>
        <Search className="h-3.5 w-3.5 text-brand-mint" />
        {!c && <><span className="flex-1 text-left">{t('nav.search')}</span>{!mobile && <kbd className="rounded-md bg-brand-mint/15 px-1.5 text-2xs font-semibold text-brand-mint">{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>}</>}
      </button>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 scrollbar-thin">
        {main.map((n) => <NavItemLink key={n.to} item={n} collapsed={c} />)}
        {workspace.length > 0 && (
          <>
            {!c ? <p className="px-2.5 pb-1 pt-5 text-2xs font-semibold uppercase tracking-[0.16em] text-brand-mint/70">{t('nav.workspace')}</p> : <div className="my-3 border-t border-white/10" />}
            {workspace.map((n) => <NavItemLink key={n.to} item={n} collapsed={c} />)}
          </>
        )}
      </nav>

      <div className="border-t border-white/10 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
        {!c && <GoogleConnect />}
        {!c && <LanguagePicker />}
        <div className={cn('flex items-center gap-2.5 rounded-2xl bg-white/[0.04] p-2', c && 'flex-col bg-transparent p-0')}>
          <Avatar name={user?.fullName} size="md" />
          {!c && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-paper">{user?.fullName}</p>
              <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-brand-mint">{humanize(user?.role)}</p>
            </div>
          )}
          <button onClick={signOut} title={t('nav.signOut')} className="flex h-9 w-9 items-center justify-center rounded-full text-paper/60 transition-colors hover:bg-white/10 hover:text-paper"><LogOut className="h-4 w-4" /></button>
        </div>
        {!mobile && (
          <button onClick={() => setCollapsed((v) => !v)} title="Collapse sidebar ( [ )"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1 text-2xs text-paper/40 hover:bg-white/[0.06] hover:text-paper">
            {c ? <ChevronsRight className="h-3.5 w-3.5" /> : <><ChevronsLeft className="h-3.5 w-3.5" />{t('nav.collapse')}</>}
          </button>
        )}
      </div>
    </>
  );

  // Phones get four primary tabs plus "More" (the full menu in a drawer).
  const tabs = main.slice(0, 4);
  return (
    <div className="flex h-full">
      <aside className={cn('relative isolate hidden shrink-0 flex-col overflow-hidden bg-[#141614] text-paper transition-[width] duration-200 lg:flex', collapsed ? 'w-[60px]' : 'w-[240px]')}>
        {sidebar(collapsed)}
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fade-in_.2s_ease-out]" />
          <aside className="relative isolate flex h-full w-[min(300px,86vw)] flex-col overflow-hidden bg-[#141614] text-paper shadow-[30px_0_60px_-20px_rgba(0,0,0,.6)] animate-[drawer-in_.28s_cubic-bezier(.16,1,.3,1)]">
            {sidebar(false, true)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onSearch={() => setCmdOpen(true)} onMenu={() => setDrawer(true)} />
        <main className="app-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-canvas scrollbar-thin">
          <div key={location.pathname} className="mx-auto max-w-[1360px] animate-[page-in_.35s_cubic-bezier(.16,1,.3,1)] px-3 pb-28 pt-4 sm:px-6 sm:py-6 lg:pb-6"><Outlet /></div>
          {user?.role === 'BDR' && <AskProsperr />}
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 flex items-stretch gap-1 rounded-[22px] border border-white/10 bg-[#141614]/95 p-1.5 text-paper shadow-[0_20px_50px_-15px_rgba(0,0,0,.6)] backdrop-blur-xl lg:hidden">
        {tabs.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}
            className={({ isActive }) => cn('flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[10.5px] font-semibold transition-colors', isActive ? 'bg-brand-mint text-brand-night' : 'text-paper/55 active:bg-white/10')}>
            <n.icon className="h-[18px] w-[18px]" />{n.label}
          </NavLink>
        ))}
        <button onClick={() => setDrawer(true)} className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[10.5px] font-semibold text-paper/55 active:bg-white/10">
          <Menu className="h-[18px] w-[18px]" />{t('nav.more')}
        </button>
      </nav>
      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}

/** Changes the language of menus and the main working screens; everything else falls back to English. */
function LanguagePicker() {
  const { lang, setLang } = useLanguage();
  const t = useT();
  return (
    <label className="mb-2 flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 text-[12px] text-paper/70 focus-within:border-brand-mint/40">
      <Languages className="h-3.5 w-3.5 shrink-0 text-brand-mint" />
      <span className="sr-only">{t('nav.language')}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as LangCode)} aria-label={t('nav.language')}
        className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent font-medium text-paper outline-none [&>option]:bg-[#141614]">
        {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}{l.code !== 'en' ? ` · ${l.name}` : ''}</option>)}
      </select>
    </label>
  );
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function NavItemLink({ item, collapsed }: { item: ReturnType<typeof navFor>[number]; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.to === '/'} title={collapsed ? item.label : undefined}
      className={({ isActive }) => cn('group relative flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13.5px] font-medium text-paper/60 transition-all duration-200 hover:bg-white/[0.06] hover:text-paper',
        isActive && 'bg-brand-mint/[0.14] text-paper ring-1 ring-brand-mint/25 hover:bg-brand-mint/[0.18] [&_svg]:text-brand-mint before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-brand-mint before:shadow-[0_0_10px_rgba(35,178,74,.8)]', collapsed && 'justify-center px-0')}>
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {!collapsed && item.shortcut && (
        <span className="kbd-hint hidden items-center gap-0.5 text-2xs text-paper/45 group-hover:inline-flex" title={`Keyboard shortcut: press G, then ${item.shortcut.toUpperCase()}`}>
          <kbd className="rounded border border-white/15 px-1 font-sans">G</kbd><span className="px-0.5">then</span><kbd className="rounded border border-white/15 px-1 font-sans">{item.shortcut.toUpperCase()}</kbd>
        </span>
      )}
    </NavLink>
  );
}

function TopBar({ onSearch, onMenu }: { onSearch: () => void; onMenu: () => void }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const crumbs = pathname.split('/').filter(Boolean);
  const t = useT();
  const found = navFor(user?.role).find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));
  const item = found && { ...found, label: t(`nav.${found.to}`, undefined, found.label) };
  const Icon = item?.icon;
  const title = crumbs[0] === 'accounts' && crumbs[1] ? 'Account' : item?.label ?? 'Home';
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line/70 bg-canvas/85 px-3 backdrop-blur-xl sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <button onClick={onMenu} aria-label="Open menu" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#141614] text-brand-mint lg:hidden"><LogoMark size={20} tone="light" /></button>
        {Icon && <span className="hidden h-8 w-8 shrink-0 sm:flex items-center justify-center rounded-xl bg-brand-forest text-white"><Icon className="h-4 w-4" /></span>}
        {crumbs[0] === 'accounts' && crumbs[1] && <><NavLink to="/accounts" className="hidden text-[13px] font-medium text-brand-forest/70 hover:text-brand-forest sm:inline">Accounts</NavLink><span className="hidden text-brand-forest/30 sm:inline">/</span></>}
        <span className="truncate font-display text-[16px] font-medium tracking-[-0.02em]">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onSearch} aria-label={t('nav.search')} className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-forest/15 bg-brand-forest-50/70 text-brand-forest md:hidden"><Search className="h-4 w-4" /></button>
        <button onClick={onSearch} className="group hidden h-9 w-72 items-center gap-2.5 whitespace-nowrap rounded-full border border-brand-forest/15 bg-brand-forest-50/70 pl-3.5 pr-1.5 text-[13px] font-medium text-brand-forest transition-all hover:border-brand-forest/35 hover:bg-white hover:shadow-[0_8px_20px_-14px_rgba(5,63,26,.7)] md:flex">
          <Search className="h-4 w-4 shrink-0 text-brand-forest/70 group-hover:text-brand-forest" />
          <span className="min-w-0 flex-1 truncate text-left text-brand-forest/75 group-hover:text-brand-forest">{t('nav.searchLong')}</span>
          <kbd className="shrink-0 rounded-full bg-brand-forest px-2 py-0.5 font-sans text-[10.5px] font-semibold tracking-wide text-white">{IS_MAC ? '⌘ K' : 'Ctrl K'}</kbd>
        </button>
        <span className="hidden items-center gap-1.5 rounded-full bg-brand-forest-50 px-2.5 py-1 text-[11px] font-semibold text-brand-forest lg:inline-flex" title="Data refreshes automatically">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute h-full w-full rounded-full bg-brand-mint motion-safe:animate-ping" /><span className="relative h-1.5 w-1.5 rounded-full bg-brand-mint" /></span>Live
        </span>
        <Notifications />
      </div>
    </header>
  );
}

const notifIcon: Record<string, typeof Bell> = { SQL: ClipboardCheck, ASSIGN: UserPlus, MEETING: CalendarClock, TASK: CheckSquare, ACCOUNT: Building2 };
const iconFor = (n: NotificationRow) => notifIcon[Object.keys(notifIcon).find((k) => `${n.type} ${n.entityType ?? ''}`.toUpperCase().includes(k)) ?? ''] ?? Bell;

function Notifications() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const seen = useRef<Set<string> | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const { data = [], isSuccess } = useQuery({
    queryKey: ['notifications'], queryFn: () => api.get<NotificationRow[]>('/api/notifications'), refetchInterval: 10_000, refetchOnWindowFocus: true,
  });
  const unread = data.filter((n) => !n.readAt).length;

  const openOne = async (n: NotificationRow) => {
    if (!n.readAt) await api.post(`/api/notifications/${n.id}/read`).catch(() => undefined);
    qc.invalidateQueries({ queryKey: ['notifications'] });
    setOpen(false);
    if (n.entityType?.toLowerCase().includes('account') && n.entityId) navigate(`/accounts/${n.entityId}`);
  };

  // Live: toast anything new that arrived since the last poll (not on first load).
  useEffect(() => {
    if (!isSuccess) return; // wait for the first real response, so existing notifications never toast on load
    if (seen.current === null) { seen.current = new Set(data.map((n) => n.id)); return; }
    const fresh = data.filter((n) => !seen.current!.has(n.id) && !n.readAt);
    fresh.forEach((n) => {
      seen.current!.add(n.id);
      toast(n.title, { description: n.body, icon: <Bell className="h-4 w-4 text-brand-forest" />, action: { label: 'Open', onClick: () => openOne(n) } });
    });
    // Something happened elsewhere in the team: refresh every open screen right away, not at the next poll.
    if (fresh.length) qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'notifications' });
  }, [data, isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const out = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', h);
    document.addEventListener('mousedown', out);
    return () => { window.removeEventListener('keydown', h); document.removeEventListener('mousedown', out); };
  }, [open]);

  const list = onlyUnread ? data.filter((n) => !n.readAt) : data;
  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Notifications"
        className={cn('relative flex h-9 w-9 items-center justify-center rounded-full border transition-all', open ? 'border-brand-forest bg-brand-forest text-white' : 'border-line bg-white text-ink-soft hover:border-brand-forest/30 hover:text-ink')}>
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center">
            <span className="absolute h-full w-full rounded-full bg-brand-mint/60 motion-safe:animate-ping" />
            <span className="relative flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-mint px-1 text-[10px] font-bold text-brand-night ring-2 ring-canvas">{unread > 9 ? '9+' : unread}</span>
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-x-3 top-16 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px] overflow-hidden rounded-[22px] border border-white/10 bg-[#141614]/95 text-paper shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)] backdrop-blur-xl animate-pop-in">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
              <div>
                <p className="font-display text-[16px] font-medium">{t('nav.notifications')}</p>
                <p className="text-[11px] text-paper/45">{unread ? `${unread} unread` : 'You’re all caught up'} · live · every 10 s</p>
              </div>
              {unread > 0 && <button className="rounded-full bg-brand-mint/15 px-2.5 py-1 text-[11px] font-semibold text-brand-mint hover:bg-brand-mint/25" onClick={async () => { await api.post('/api/notifications/read-all'); qc.invalidateQueries({ queryKey: ['notifications'] }); }}>Mark all read</button>}
            </div>
            <div className="flex gap-1 px-4 pt-3">
              {[['All', false], ['Unread', true]].map(([l, v]) => (
                <button key={l as string} onClick={() => setOnlyUnread(v as boolean)} className={cn('rounded-full px-3 py-1 text-[12px] font-semibold', onlyUnread === v ? 'bg-brand-mint text-brand-night' : 'text-paper/55 hover:text-paper')}>{l as string}</button>
              ))}
            </div>
            <div className="max-h-[440px] space-y-1.5 overflow-y-auto p-3 scrollbar-thin">
              {list.length === 0 && <p className="px-4 py-10 text-center text-xs text-paper/45">Nothing here.</p>}
              {list.slice(0, 40).map((n) => {
                const I = iconFor(n);
                return (
                  <button key={n.id} onClick={() => openOne(n)} className={cn('flex w-full gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors', n.readAt ? 'border-transparent hover:bg-white/[0.04]' : 'border-brand-mint/20 bg-brand-mint/[0.07] hover:bg-brand-mint/[0.12]')}>
                    <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', n.readAt ? 'bg-white/[0.06] text-paper/55' : 'bg-brand-mint text-brand-night')}><I className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-paper">{n.title}</span>
                      {n.body && <span className="mt-0.5 block text-[12px] text-paper/55 line-clamp-2">{n.body}</span>}
                      <span className="mt-1 block text-[10.5px] text-paper/40">{relTime(n.createdAt)}</span>
                    </span>
                    {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-mint" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}