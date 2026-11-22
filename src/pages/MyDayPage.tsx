import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Phone, PhoneCall, Play, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { fmtTime, relTime } from '@/lib/format';
import type { MyDayItem, StakeholderView } from '@/lib/types';
import { Avatar, Badge, Button, Card, Empty, Kbd, PageHeader, SkeletonRows, Tabs } from '@/components/ui/ui';
import { LogCallModal, type CallTarget } from '@/features/calls/LogCallModal';
import { SubmitSqlModal } from '@/features/sql/SqlForms';

type Section = MyDayItem['section'];
const SECTIONS: { value: Section; label: string; icon: typeof Phone; tone: string }[] = [
  { value: 'OVERDUE', label: 'Overdue', icon: TriangleAlert, tone: 'text-danger' },
  { value: 'DUE_TODAY', label: 'Due today', icon: CalendarClock, tone: 'text-accent' },
  { value: 'UNTOUCHED', label: 'New leads', icon: Sparkles, tone: 'text-success' },
  { value: 'REVIVAL', label: 'Revival', icon: RotateCcw, tone: 'text-warning' },
];

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

/** The BDR's calling list: overdue first, then today, then untouched leads by seniority, then revivals (M2-1). */
export default function MyDayPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({ queryKey: ['my-day'], queryFn: () => api.get<MyDayItem[]>('/api/my-day') });
  const counts = useMemo(() => Object.fromEntries(SECTIONS.map((s) => [s.value, data.filter((d) => d.section === s.value).length])) as Record<Section, number>, [data]);
  const [tab, setTab] = useState<Section>('OVERDUE');
  const [cursor, setCursor] = useState(0);
  const [target, setTarget] = useState<CallTarget | null>(null);
  const [session, setSession] = useState(false);
  const [sqlFor, setSqlFor] = useState<{ accountId: string; accountName: string; stakeholders: StakeholderView[] } | null>(null);

  // Land on the first non-empty section.
  useEffect(() => {
    if (!data.length) return;
    if (!counts[tab]) { const first = SECTIONS.find((s) => counts[s.value]); if (first) setTab(first.value); }
  }, [data.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = data.filter((d) => d.section === tab);
  const callable = data.filter((d) => d.stakeholderId && d.section !== 'REVIVAL');

  const open = (item: MyDayItem) => {
    if (!item.stakeholderId) { navigate(`/accounts/${item.accountId}`); return; }
    setTarget({ stakeholderId: item.stakeholderId, name: item.stakeholderName ?? 'Stakeholder', designation: item.designation, accountName: item.accountName });
  };

  // J/K to move, Enter or L to log the highlighted row.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (target || sqlFor || /input|textarea|select/i.test((e.target as HTMLElement).tagName)) return;
      if (e.key === 'j') setCursor((c) => Math.min(c + 1, rows.length - 1));
      if (e.key === 'k') setCursor((c) => Math.max(c - 1, 0));
      if ((e.key === 'Enter' || e.key === 'l') && rows[cursor]) open(rows[cursor]);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const afterLog = async (r: { openL1Booking: boolean; nextQueueItem?: MyDayItem | null }, next: boolean) => {
    const current = target;
    if (r.openL1Booking && current) {
      const item = data.find((d) => d.stakeholderId === current.stakeholderId);
      if (item) {
        const st = await api.get<StakeholderView[]>(`/api/accounts/${item.accountId}/stakeholders`);
        setTarget(null);
        setSqlFor({ accountId: item.accountId, accountName: item.accountName, stakeholders: st });
        return;
      }
    }
    if (next || session) {
      const idx = callable.findIndex((d) => d.stakeholderId === current?.stakeholderId);
      const n = r.nextQueueItem ?? callable[idx + 1];
      if (n?.stakeholderId) { open(n); return; }
      setSession(false);
    }
    setTarget(null);
  };

  return (
    <div>
      <PageHeader title={`${greeting()}, ${user?.fullName.split(' ')[0]}`}
        subtitle={isLoading ? 'Loading your day…' : data.length ? `${counts.OVERDUE + counts.DUE_TODAY} follow-ups and ${counts.UNTOUCHED} new leads to call today.` : 'Nothing queued — add stakeholders to start calling.'}
        actions={callable.length > 0 && (
          <Button variant="primary" icon={<Play className="h-3.5 w-3.5" />} onClick={() => { setSession(true); open(callable[0]); }}>Start calling</Button>
        )} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {SECTIONS.map((s) => (
          <button key={s.value} onClick={() => { setTab(s.value); setCursor(0); }}
            className={cn('flex items-center gap-3 rounded-xl border bg-white p-3.5 text-left shadow-card transition-all',
              tab === s.value ? 'border-accent ring-2 ring-accent/10' : 'border-line hover:border-ink-muted/30')}>
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-canvas', s.tone)}><s.icon className="h-4 w-4" /></span>
            <span><span className="block text-[22px] font-semibold leading-6 tabular-nums">{counts[s.value] ?? 0}</span><span className="text-xs text-ink-muted">{s.label}</span></span>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between px-4 pt-3">
          <Tabs value={tab} onChange={(v) => { setTab(v); setCursor(0); }} tabs={SECTIONS.map((s) => ({ value: s.value, label: s.label, count: counts[s.value] }))} />
          <span className="hidden items-center gap-1.5 text-2xs text-ink-muted md:flex"><Kbd>J</Kbd><Kbd>K</Kbd> move <Kbd>Enter</Kbd> log call</span>
        </div>
        {isLoading ? <SkeletonRows /> : rows.length === 0 ? (
          <Empty icon={<CheckCircle2 className="h-5 w-5" />} title="All clear here" body="Nothing in this list right now. Check the other tabs or add new stakeholders." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r, i) => (
              <li key={`${r.taskId ?? r.stakeholderId ?? r.accountId}-${i}`} onMouseEnter={() => setCursor(i)}
                className={cn('group flex items-center gap-4 px-4 py-3 transition-colors', cursor === i ? 'bg-accent-soft/40' : 'hover:bg-canvas')}>
                <Avatar name={r.stakeholderName ?? r.accountName} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">
                    {r.stakeholderName ?? r.accountName}
                    {r.designation && <span className="ml-1.5 font-normal text-ink-muted">· {r.designation}</span>}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    <Link to={`/accounts/${r.accountId}`} className="hover:text-accent hover:underline">{r.accountName}</Link>
                    {r.title && <> · {r.title}</>}
                  </p>
                </div>
                {r.priorityRank <= 3 && r.section === 'UNTOUCHED' && <Badge tone="accent">Senior</Badge>}
                {r.dueAt && <span className={cn('w-24 text-right text-xs tabular-nums', r.section === 'OVERDUE' ? 'text-danger' : 'text-ink-muted')}>
                  {r.section === 'DUE_TODAY' ? fmtTime(r.dueAt) : relTime(r.dueAt)}</span>}
                <div className="flex items-center gap-1.5">
                  {r.phone && (
                    <a href={`tel:${r.phone}`} onClick={() => open(r)} title={`Call ${r.phone}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-xs font-medium tabular-nums text-ink-soft shadow-card hover:border-success/40 hover:text-success">
                      <Phone className="h-3.5 w-3.5" />{r.phone}
                    </a>
                  )}
                  <Button size="sm" variant={cursor === i ? 'primary' : 'secondary'} icon={<PhoneCall className="h-3.5 w-3.5" />} onClick={() => open(r)}>
                    {r.stakeholderId ? 'Log call' : 'Open'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <LogCallModal open={!!target} target={target} saveAndNext onClose={() => { setTarget(null); setSession(false); }} onLogged={afterLog} />
      {sqlFor && <SubmitSqlModal open onClose={() => setSqlFor(null)} {...sqlFor} />}
    </div>
  );
}
