import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Phone, PhoneCall, Play, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { fmtTime, relTime } from '@/lib/format';
import type { MyDayItem, StakeholderView } from '@/lib/types';
import { Avatar, Button, Empty, Kbd, PageHeader, SkeletonRows } from '@/components/ui/ui';
import { LogCallModal, type CallTarget } from '@/features/calls/LogCallModal';
import { SubmitSqlModal } from '@/features/sql/SqlForms';
import { useT } from '@/lib/i18n';
import { WhatsAppButton } from '@/features/calls/WhatsApp';

type Section = MyDayItem['section'];
const SECTIONS: { value: Section; label: string; icon: typeof Phone; tone: string }[] = [
  { value: 'OVERDUE', label: 'myday.overdue', icon: TriangleAlert, tone: 'myday.overdueHint' },
  { value: 'DUE_TODAY', label: 'myday.dueToday', icon: CalendarClock, tone: 'myday.dueTodayHint' },
  { value: 'UNTOUCHED', label: 'myday.newLeads', icon: Sparkles, tone: 'myday.newLeadsHint' },
  { value: 'REVIVAL', label: 'myday.revival', icon: RotateCcw, tone: 'myday.revivalHint' },
];

const greetingKey = () => { const h = new Date().getHours(); return h < 12 ? 'myday.morning' : h < 17 ? 'myday.afternoon' : 'myday.evening'; };

/** The BDR's calling list: overdue first, then today, then untouched leads by seniority, then revivals (M2-1). */
export default function MyDayPage() {
  const { user } = useAuth();
  const t = useT();
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
      <PageHeader title={`${t(greetingKey())}, ${user?.fullName.split(' ')[0]}`} icon={<PhoneCall />} eyebrow={t('myday.eyebrow')}
        subtitle={isLoading ? t('myday.loading') : data.length ? t('myday.summary', { f: counts.OVERDUE + counts.DUE_TODAY, n: counts.UNTOUCHED }) : t('myday.empty')}
      />

      {callable.length > 0 && (() => {
        const nx = callable[0];
        return (
          <div className="relative mb-4 overflow-hidden rounded-[24px] bg-[#141614] p-4 text-paper sm:p-5">
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-brand-mint/20 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-4">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-brand-mint/40 motion-safe:animate-ping" />
                <span className="relative block rounded-full ring-2 ring-brand-mint"><Avatar name={nx.stakeholderName ?? nx.accountName} size="md" /></span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brand-mint">{t('myday.upNext')}</p>
                <p className="mt-0.5 truncate font-display text-[20px] font-medium tracking-[-0.02em]">{nx.stakeholderName}</p>
                <p className="truncate text-[12.5px] text-paper/60">{nx.designation ? `${nx.designation} · ` : ''}{nx.accountName}</p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                {nx.phone && <WhatsAppButton phone={nx.phone} name={nx.stakeholderName} onOpened={() => { setSession(true); open(nx); }} className="h-10 border-white/15 bg-white/10 px-4 text-paper hover:bg-white/15" />}
                {nx.phone && <a href={`tel:${nx.phone}`} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-[13px] font-semibold tabular-nums text-paper hover:bg-white/10 sm:flex-none"><Phone className="h-4 w-4 text-brand-mint" />{nx.phone}</a>}
                <button onClick={() => { setSession(true); open(nx); }} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-brand-mint px-5 text-[13px] font-bold text-brand-night shadow-[0_0_24px_rgba(35,178,74,.45)] transition-transform hover:scale-[1.03] sm:flex-none"><Play className="h-4 w-4 shrink-0" /><span className="whitespace-nowrap">{t('myday.start')}<span className="hidden sm:inline"> {t('myday.session')}</span> · {callable.length}</span></button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="mb-4 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none sm:grid sm:grid-cols-4 sm:overflow-visible">
        {SECTIONS.map((x) => (
          <button key={x.value} onClick={() => { setTab(x.value); setCursor(0); }}
            className={cn('group relative flex min-w-[150px] shrink-0 items-center gap-3 overflow-hidden rounded-[20px] border p-3.5 text-left transition-all', tab === x.value ? 'border-transparent bg-brand-forest text-white shadow-[0_14px_30px_-16px_rgba(5,63,26,.9)]' : 'border-line/80 bg-white hover:border-brand-forest/25')}>
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', tab === x.value ? 'bg-brand-mint text-brand-night' : 'bg-brand-forest-50 text-brand-forest')}><x.icon className="h-[18px] w-[18px]" /></span>
            <span className="min-w-0">
              <span className="flex items-baseline gap-2"><span className="font-display text-[24px] font-medium leading-none tabular-nums">{counts[x.value] ?? 0}</span><span className="text-[12.5px] font-semibold">{t(x.label)}</span></span>
              <span className={cn('mt-1 block truncate text-[11px]', tab === x.value ? 'text-white/60' : 'text-brand-forest/60')}>{t(x.tone)}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-line/80 bg-white p-2 sm:p-3">
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <p className="font-display text-[16px] font-medium tracking-[-0.02em]">{t(SECTIONS.find((x) => x.value === tab)?.label ?? '')}<span className="ml-2 text-[12px] font-sans font-medium text-brand-forest/60">{t('myday.toCall', { n: rows.length })}</span></p>
          <span className="hidden items-center gap-1.5 text-2xs text-ink-muted md:flex"><Kbd>J</Kbd><Kbd>K</Kbd> {t('myday.move')} <Kbd>Enter</Kbd> {t('myday.logCall')}</span>
        </div>
        {isLoading ? <SkeletonRows /> : rows.length === 0 ? (
          <Empty icon={<CheckCircle2 className="h-5 w-5" />} title={t('myday.allClear')} body={t('myday.allClearBody')} />
        ) : (
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li key={`${r.taskId ?? r.stakeholderId ?? r.accountId}-${i}`} onMouseEnter={() => setCursor(i)}
                className={cn('group relative flex flex-wrap items-center gap-x-3 gap-y-2.5 overflow-hidden rounded-[18px] border px-3.5 py-3 transition-all duration-200 sm:flex-nowrap sm:gap-4 sm:px-4',
                  cursor === i ? 'border-brand-forest/25 bg-gradient-to-r from-brand-forest-50 to-white shadow-[0_12px_28px_-20px_rgba(5,63,26,.6)]' : 'border-line/70 bg-white hover:border-brand-forest/20')}>
                {cursor === i && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-brand-mint shadow-[0_0_10px_rgba(35,178,74,.7)]" />}
                <Avatar name={r.stakeholderName ?? r.accountName} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[14px] font-semibold"><span className="truncate">{r.stakeholderName ?? r.accountName}</span>
                    {r.priorityRank <= 3 && r.section === 'UNTOUCHED' && <span className="shrink-0 rounded-full bg-brand-mint/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-forest">{t('myday.senior')}</span>}</p>
                  <p className="truncate text-[12px] text-brand-forest/70">
                    {r.designation && <>{r.designation} · </>}
                    <Link to={`/accounts/${r.accountId}`} className="font-medium text-brand-forest hover:underline">{r.accountName}</Link>
                    {r.title && <> · {r.title}</>}
                  </p>
                </div>
                {r.dueAt && <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums', r.section === 'OVERDUE' ? 'bg-brand-navy/10 text-brand-navy' : 'bg-brand-forest-50 text-brand-forest')}>
                  {r.section === 'DUE_TODAY' ? fmtTime(r.dueAt) : relTime(r.dueAt)}</span>}
                <div className="flex w-full items-center gap-1.5 sm:w-auto">
                  {r.phone && r.stakeholderId && <WhatsAppButton phone={r.phone} name={r.stakeholderName} onOpened={() => open(r)} compact className="h-9 w-9 shrink-0 sm:h-8 sm:w-8" />}
                  {r.phone && (
                    <a href={`tel:${r.phone}`} onClick={() => open(r)} title={`Call ${r.phone}`}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-semibold tabular-nums text-brand-forest transition-colors hover:border-brand-forest/40 sm:h-8 sm:flex-none">
                      <Phone className="h-3.5 w-3.5" />{r.phone}
                    </a>
                  )}
                  <Button size="sm" className="h-9 flex-1 justify-center sm:h-8 sm:flex-none" variant={cursor === i ? 'primary' : 'secondary'} icon={<PhoneCall className="h-3.5 w-3.5" />} onClick={() => open(r)}>
                    {r.stakeholderId ? t('myday.logCall') : t('common.open')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LogCallModal open={!!target} target={target} saveAndNext onClose={() => { setTarget(null); setSession(false); }} onLogged={afterLog} />
      {sqlFor && <SubmitSqlModal open onClose={() => setSqlFor(null)} {...sqlFor} />}
    </div>
  );
}
