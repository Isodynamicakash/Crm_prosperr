import { BarChart3, Building2, CalendarCheck2, CheckSquare, ClipboardCheck, Home, KanbanSquare, Settings, Users, type LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/types';

export interface NavItem { to: string; label: string; icon: LucideIcon; roles: Role[]; group: 'main' | 'workspace'; shortcut?: string }

/** One list drives the sidebar, the command menu and the "g + key" shortcuts. Each role only sees its own work. */
export const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, roles: ['BDR', 'AE', 'MANAGER', 'ADMIN'], group: 'main', shortcut: 'h' },
  { to: '/my-day', label: 'My Day', icon: CalendarCheck2, roles: ['BDR'], group: 'main', shortcut: 'd' },
  { to: '/accounts', label: 'Accounts', icon: Building2, roles: ['BDR', 'AE', 'MANAGER', 'ADMIN'], group: 'main', shortcut: 'a' },
  { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare, roles: ['AE', 'MANAGER', 'ADMIN'], group: 'main', shortcut: 'p' },
  { to: '/sql', label: 'SQLs', icon: ClipboardCheck, roles: ['BDR', 'MANAGER', 'ADMIN'], group: 'main', shortcut: 's' },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, roles: ['BDR', 'AE', 'MANAGER', 'ADMIN'], group: 'main', shortcut: 't' },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['MANAGER', 'ADMIN'], group: 'workspace', shortcut: 'r' },
  { to: '/team', label: 'Team', icon: Users, roles: ['MANAGER', 'ADMIN'], group: 'workspace' },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['MANAGER', 'ADMIN'], group: 'workspace' },
];

export const navFor = (role?: Role) => NAV.filter((n) => role && n.roles.includes(role));
