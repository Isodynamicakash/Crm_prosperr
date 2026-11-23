import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Flag, KanbanSquare, List } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { isLeadership, useAuth } from '@/lib/auth';
import { useUsers } from '@/lib/queries';
import { cn } from '@/lib/cn';
import { fmtDate, inr, relTime } from '@/lib/format';
import type { AccountPage, AccountRow, LifecycleStage, Page } from '@/lib/types';
import { Avatar, Card, EntityTile, PageHeader, Select, Skeleton } from '@/components/ui/ui';
import { TemperatureBadge, stageLabel } from '@/components/ui/status';
import { MANUAL_MOVES, StageMoveModal } from '@/features/pipeline/OpportunityPanel';

const COLUMNS: LifecycleStage[] = ['SQL', 'L1', 'MULTITHREADING', 'L2', 'L3', 'NEGOTIATION', 'WON'];
const OPEN_PIPELINE_STAGES: LifecycleStage[] = ['SQL', 'L1', 'MULTITHREADING', 'L2', 'L3', 'NEGOTIATION'];
const lane: Partial<Record<LifecycleStage, string>> = {
  SQL: 'from-[#CDEBD5] to-[#7CCB8E]', L1: 'from-[#7CCB8E] to-[#23B24A]', MULTITHREADING: 'from-[#23B24A] to-[#1A7F36]', L2: 'from-[#1A7F36] to-[#0E5A2A]',
  L3: 'from-[#0E5A2A] to-[#053F1A]', NEGOTIATION: 'from-[#053F1A] to-[#202E64]', WON: 'from-[#23B24A] to-[#2BC556]',
};
const tempStripe: Record<string, string> = { HOT: 'bg-brand-forest', WARM: 'bg-brand-mint', COLD: 'bg-brand-navy' };

/**
 * Kanban of active pipeline accounts. Most stages move automatically when a meeting outcome is recorded;
 * dragging only allows the moves the business rules permit (e.g. L3 → Negotiation → Won, or Lost).
 */
export default function PipelinePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const leader = isLeadership(user?.role);
  const users = useUsers(leader);
  const [aeId, setAeId] = useState(() => (user?.role === 'AE' ? user.id : ''));
  const [temp, setTemp] = useState('');
  const [drag, setDrag] = useState<AccountRow | null>(null);
  const [over, setOver] = useState<LifecycleStage | null>(null);
  const [move, setMove] = useState<{ oppId: string; target: LifecycleStage } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', 'pipeline', aeId, temp],
    queryFn: () => api.get<Page<AccountRow>>('/api/accounts', { zone: 'PIPELINE', status: 'ACTIVE', aeId: aeId || undefined, temperature: temp || undefined, size: 500, sort: 'nextStepDue' }),
  });

  const byStage = useMemo(() => {
    const m = Object.fromEntries(COLUMNS.map((c) => [c, [] as AccountRow[]])) as Record<LifecycleStage, AccountRow[]>;
    data?.items.forEach((a) => { (m[a.stage] ??= []).push(a); });
    return m;
  }, [data]);

  const drop = async (target: LifecycleStage) => {
    setOver(null);
    const a = drag;
    setDrag(null);
    if (!a || a.stage === target) return;
    if (!(MANUAL_MOVES[a.stage] ?? []).includes(target)) {
      toast.info(`${stageLabel[a.stage]} → ${stageLabel[target]} happens automatically when the meeting outcome is recorded.`);
      return;
    }
    try {
      const page = await api.get<AccountPage>(`/api/accounts/${a.id}`);
      if (page.opportunity) setMove({ oppId: page.opportunity.id, target });
    } catch (e) { toast.error((e as Error).message); }
  };

  const openDeals = (data?.items ?? []).filter((a) => OPEN_PIPELINE_STAGES.includes(a.stage));
  const total = openDeals.reduce((s, a) => s + Number(a.expectedMrr ?? 0), 0);
  const hotDeals = openDeals.filter((a) => a.temperature === 'HOT');
  const noNextStep = openDeals.filter((a) => !a.nextStep).length;

  return (
    <div>
      <PageHeader title="Pipeline" icon={<KanbanSquare />} eyebrow="Deal flow" subtitle="Drag a deal where the rules allow; meeting outcomes move the rest automatically."
        stats={[
          { label: 'Open opportunities', value: openDeals.length, hint: 'SQL through Negotiation' },
          { label: 'Expected MRR', value: inr(total), hint: 'Sum of open deals' },
          { label: 'Hot deals', value: hotDeals.length, hint: `${inr(hotDeals.reduce((x, a) => x + Number(a.expectedMrr ?? 0), 0))} at stake`, onClick: () => setTemp(temp === 'HOT' ? '' : 'HOT') },
          { label: 'No next step', value: noNextStep, hint: 'Needs an owner action' },
        ]}
        actions={<>
          {leader && (
            <Select value={aeId} onChange={(e) => setAeId(e.target.value)} className="w-40">
              <option value="">All AEs</option>{users.data?.filter((u) => u.role === 'AE').map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </Select>
          )}
          <Select value={temp} onChange={(e) => setTemp(e.target.value)} className="w-32">
            <option value="">Any temp.</option><option value="HOT">Hot</option><option value="WARM">Warm</option><option value="COLD">Cold</option>
          </Select>
          <div data-segmented className="inline-flex rounded-full border border-line bg-white p-1">
            <span data-on className="flex h-7 items-center gap-1 rounded-full px-3 text-xs font-semibold"><KanbanSquare className="h-3.5 w-3.5" />Board</span>
            <Link to={`/accounts?v=${encodeURIComponent(JSON.stringify({ q: '', status: 'ACTIVE', zone: 'PIPELINE', stage: [], sizeBucket: '', temperature: temp, cityId: '', flagged: false, sort: 'nextStepDue' }))}`}
              className="flex h-7 items-center gap-1 rounded-full px-3 text-xs font-semibold text-paper/60 hover:text-paper"><List className="h-3.5 w-3.5" />Table</Link>
          </div>
        </>} />

      <div className="-mx-3 snap-x snap-mandatory overflow-x-auto px-3 pb-4 scrollbar-thin sm:-mx-6 sm:snap-none sm:px-6">
        <div className="flex min-w-max gap-3">
          {COLUMNS.map((stage) => {
            const items = byStage[stage] ?? [];
            const mrr = items.reduce((s, a) => s + Number(a.expectedMrr ?? 0), 0);
            const allowed = drag && (MANUAL_MOVES[drag.stage] ?? []).includes(stage);
            return (
              <div key={stage} onDragOver={(e) => { e.preventDefault(); setOver(stage); }} onDragLeave={() => setOver(null)} onDrop={() => drop(stage)}
                className={cn('relative flex w-[84vw] shrink-0 snap-center flex-col overflow-hidden rounded-[24px] sm:w-[288px] border border-line/80 bg-white/60 p-2.5 backdrop-blur transition-all duration-200',
                  over === stage && (allowed ? 'border-brand-mint/50 bg-brand-forest-50 shadow-[0_0_0_4px_rgba(35,178,74,.12)]' : 'bg-black/[0.04]'))}>
                <span className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', lane[stage])} />
                <div className="px-2 pb-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 font-display text-[15px] font-medium tracking-[-0.01em]">{stageLabel[stage]}
                      <span className="rounded-full bg-brand-forest px-2 py-0.5 text-[10.5px] font-semibold text-white">{items.length}</span></p>
                    <span className="font-display text-[14px] font-medium tabular-nums text-ink-soft">{mrr ? inr(mrr) : '—'}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/[0.06]"><div className={cn('h-full rounded-full bg-gradient-to-r transition-[width] duration-700', lane[stage])} style={{ width: `${total ? Math.max(mrr ? 4 : 0, (100 * mrr) / total) : 0}%` }} /></div>
                </div>
                <div className="flex min-h-[120px] flex-col gap-2">
                  {isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-24" />)}
                  {items.map((a) => {
                    const overdue = a.nextStepDue && a.nextStepDue < new Date().toISOString().slice(0, 10);
                    return (
                      <Card key={a.id} draggable onDragStart={() => setDrag(a)} onDragEnd={() => { setDrag(null); setOver(null); }} onClick={() => navigate(`/accounts/${a.id}`)}
                        className={cn('group relative cursor-grab overflow-hidden rounded-[18px] p-3.5 pl-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-forest/30 hover:shadow-[0_18px_36px_-20px_rgba(5,63,26,.55)] active:cursor-grabbing', drag?.id === a.id && 'rotate-2 opacity-50')}>
                        <span className={cn('absolute inset-y-0 left-0 w-1', a.temperature ? tempStripe[a.temperature] : 'bg-black/10')} />
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2.5"><EntityTile name={a.name} size="sm" /><p className="truncate text-[13.5px] font-semibold leading-5 group-hover:text-brand-forest">{a.name}</p></span>
                          {a.flaggedForReview && <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <TemperatureBadge t={a.temperature} />
                          {a.expectedMrr ? <span className="ml-auto font-display text-[15px] font-medium tabular-nums">{inr(a.expectedMrr)}</span> : null}
                        </div>
                        {a.nextStep ? (
                          <p className={cn('mt-2 flex items-start gap-1 text-2xs', overdue ? 'text-danger' : 'text-ink-muted')}>
                            <CalendarClock className="mt-px h-3 w-3 shrink-0" /><span className="line-clamp-2">{fmtDate(a.nextStepDue)} · {a.nextStep}</span>
                          </p>
                        ) : <p className="mt-2 text-2xs text-warning">No next step</p>}
                        <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2.5">
                          {a.aeOwner ? <span className="flex items-center gap-1.5 text-2xs text-ink-muted"><Avatar name={a.aeOwner} size="xs" />{a.aeOwner.split(' ')[0]}</span> : <span className="text-2xs text-danger">No AE</span>}
                          <span className="text-2xs text-ink-muted">{relTime(a.lastActivityAt)}</span>
                        </div>
                      </Card>
                    );
                  })}
                  {!isLoading && items.length === 0 && <p className="px-2 py-6 text-center text-2xs text-ink-muted">Nothing here</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {drag && <p className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs text-white shadow-pop">
        Allowed: {(MANUAL_MOVES[drag.stage] ?? []).map((s) => stageLabel[s]).join(', ') || 'none — record the meeting outcome instead'}
      </p>}
      {move && <StageMoveModal open target={move.target} opportunityId={move.oppId} onClose={() => setMove(null)} />}
      {!leader && data?.items.length === 0 && !isLoading && (
        <p className="mt-4 text-center text-xs text-ink-muted">No opportunities yet. Accounts appear here once a manager assigns them to you.</p>
      )}
    </div>
  );
}
