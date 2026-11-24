import { BarChart3, Building2, CalendarCheck2, CalendarClock, CheckSquare, ClipboardCheck, Home, KanbanSquare, QrCode, Send, Target, Settings, UserCheck, Users, type LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/types';

export interface NavItem { to: string; label: string; icon: LucideIcon; roles: Role[]; group: 'main' | 'workspace'; shortcut?: string }

/** One list drives the sidebar, the command menu and the "g + key" shortcuts. Each role only sees its own work. */
export const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, roles: ['BDR', 'AE', 'MANAGER', 'ADMIN'], group: 'main', shortcut: 'h' },
  { to: '/my-day', label: 'My Day', icon: CalendarCheck2, roles: ['BDR'], group: 'main', shortcut: 'd' },
  { to: '/accounts', label: 'Accounts', icon: Building2, roles: ['BDR', 'AE', 'MANAGER', 'ADMIN'], group: 'main', shortcut: 'a' },
  { to: '/leads', label: 'My leads', icon: Target, roles: ['BDR'], group: 'main', shortcut: 'b' },
  { to: '/leads', label: 'BDR leads', icon: Target, roles: ['MANAGER', 'ADMIN'], group: 'workspace' },
  { to: '/my-leads', label: 'My Leads', icon: UserCheck, roles: ['AE'], group: 'main', shortcut: 'l' },
  { to: '/meetings', label: 'Meetings', icon: CalendarClock, roles: ['AE'], group: 'main', shortcut: 'm' },
  { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare, roles: ['AE', 'MANAGER', 'ADMIN'], group: 'main', shortcut: 'p' },
  { to: '/sql', label: 'SQLs', icon: ClipboardCheck, roles: ['BDR', 'MANAGER'], group: 'main', shortcut: 's' },
  { to: '/sequences', label: 'Sequences', icon: Send, roles: ['BDR', 'MANAGER'], group: 'main', shortcut: 'e' },
  { to: '/event-qr', label: 'Event QR', icon: QrCode, roles: ['BDR', 'MANAGER'], group: 'main', shortcut: 'q' },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, roles: ['BDR', 'AE', 'MANAGER', 'ADMIN'], group: 'main', shortcut: 't' },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['MANAGER', 'ADMIN'], group: 'workspace', shortcut: 'r' },
  { to: '/team', label: 'Team', icon: Users, roles: ['MANAGER', 'ADMIN'], group: 'workspace' },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['MANAGER', 'ADMIN'], group: 'workspace' },
];

export const navFor = (role?: Role) => NAV.filter((n) => role && n.roles.includes(role));