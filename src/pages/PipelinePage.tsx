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
import { Avatar, Card, PageHeader, Select, Skeleton } from '@/components/ui/ui';
import { TemperatureBadge, stageLabel } from '@/components/ui/status';
import { MANUAL_MOVES, StageMoveModal } from '@/features/pipeline/OpportunityPanel';

const COLUMNS: LifecycleStage[] = ['SQL', 'L1', 'MULTITHREADING', 'L2', 'L3', 'NEGOTIATION', 'WON'];
const dot: Partial<Record<LifecycleStage, string>> = { SQL: 'bg-brand-navy-400', L1: 'bg-brand-navy', MULTITHREADING: 'bg-brand-lime', L2: 'bg-brand-forest-600', L3: 'bg-accent', NEGOTIATION: 'bg-warning', WON: 'bg-success' };

/**
 * Kanban of active pipeline accounts. Most stages move automatically when a meeting outcome is recorded;
 * dragging only allows the moves the business rules permit (e.g. L3 → Negotiation → Won, or Lost).
 */
export default function PipelinePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const leader = isLeadership(user?.role);
  const users = useUsers(leader);
  const [aeId, setAeId] = useState('');
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

  const total = data?.items.reduce((s, a) => s + Number(a.expectedMrr ?? 0), 0) ?? 0;

  return (
    <div>
      <PageHeader title="Pipeline" subtitle={`${data?.total ?? 0} active opportunities · ${inr(total)} expected MRR`}
        actions={<>
          {leader && (
            <Select value={aeId} onChange={(e) => setAeId(e.target.value)} className="w-40">
              <option value="">All AEs</option>{users.data?.filter((u) => u.role === 'AE').map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </Select>
          )}
          <Select value={temp} onChange={(e) => setTemp(e.target.value)} className="w-32">
            <option value="">Any temp.</option><option value="HOT">Hot</option><option value="WARM">Warm</option><option value="COLD">Cold</option>
          </Select>
          <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5">
            <span className="flex h-7 items-center gap-1 rounded-md bg-white px-2 text-xs font-medium shadow-card"><KanbanSquare className="h-3.5 w-3.5" />Board</span>
            <Link to={`/accounts?v=${encodeURIComponent(JSON.stringify({ q: '', status: 'ACTIVE', zone: 'PIPELINE', stage: [], sizeBucket: '', temperature: temp, cityId: '', flagged: false, sort: 'nextStepDue' }))}`}
              className="flex h-7 items-center gap-1 px-2 text-xs font-medium text-ink-muted hover:text-ink"><List className="h-3.5 w-3.5" />Table</Link>
          </div>
        </>} />

      <div className="-mx-6 overflow-x-auto px-6 pb-4 scrollbar-thin">
        <div className="flex min-w-max gap-3">
          {COLUMNS.map((stage) => {
            const items = byStage[stage] ?? [];
            const mrr = items.reduce((s, a) => s + Number(a.expectedMrr ?? 0), 0);
            const allowed = drag && (MANUAL_MOVES[drag.stage] ?? []).includes(stage);
            return (
              <div key={stage} onDragOver={(e) => { e.preventDefault(); setOver(stage); }} onDragLeave={() => setOver(null)} onDrop={() => drop(stage)}
                className={cn('flex w-[272px] flex-col rounded-xl bg-black/[0.025] p-2 transition-colors', over === stage && (allowed ? 'bg-accent-soft ring-2 ring-accent/30' : 'bg-black/[0.05]'))}>
                <div className="flex items-center justify-between px-1.5 pb-2 pt-1">
                  <p className="flex items-center gap-2 text-[13px] font-semibold"><span className={cn('h-2 w-2 rounded-full', dot[stage])} />{stageLabel[stage]}<span className="font-normal text-ink-muted">{items.length}</span></p>
                  <span className="text-2xs tabular-nums text-ink-muted">{mrr ? inr(mrr) : ''}</span>
                </div>
                <div className="flex min-h-[120px] flex-col gap-2">
                  {isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-24" />)}
                  {items.map((a) => {
                    const overdue = a.nextStepDue && a.nextStepDue < new Date().toISOString().slice(0, 10);
                    return (
                      <Card key={a.id} draggable onDragStart={() => setDrag(a)} onDragEnd={() => { setDrag(null); setOver(null); }} onClick={() => navigate(`/accounts/${a.id}`)}
                        className={cn('cursor-pointer p-3 transition-all hover:border-accent/40 hover:shadow-pop', drag?.id === a.id && 'opacity-50')}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-medium leading-5">{a.name}</p>
                          {a.flaggedForReview && <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <TemperatureBadge t={a.temperature} />
                          {a.expectedMrr ? <span className="text-xs font-medium tabular-nums">{inr(a.expectedMrr)}</span> : null}
                        </div>
                        {a.nextStep ? (
                          <p className={cn('mt-2 flex items-start gap-1 text-2xs', overdue ? 'text-danger' : 'text-ink-muted')}>
                            <CalendarClock className="mt-px h-3 w-3 shrink-0" /><span className="line-clamp-2">{fmtDate(a.nextStepDue)} · {a.nextStep}</span>
                          </p>
                        ) : <p className="mt-2 text-2xs text-warning">No next step</p>}
                        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
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
