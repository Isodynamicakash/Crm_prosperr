import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Scale, Shuffle, User } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { humanize } from '@/lib/format';
import { Modal } from '@/components/ui/overlay';
import { Button, Segmented, Select } from '@/components/ui/ui';

interface Move { accountId: string; name: string; stage: string; status: string; weight: number; toUserId: string }
interface Receiver { userId: string; name: string; loadBefore: number; accountsAdded: number; loadAfter: number }
interface Plan { from: { id: string; name: string; role: 'AE' | 'BDR'; active: boolean }; strategy: string; moves: Move[]; receivers: Receiver[]; activeSequences: number; openTasks: number }
type Strategy = 'BALANCED' | 'ROUND_ROBIN' | 'ONE';

/**
 * Hand a person's accounts to the rest of the team (someone leaves, or changes role). The plan spreads accounts by load
 * (or round-robin, or all to one person); every row can be changed before applying.
 */
export function HandoverModal({ user, onClose }: { user: { id: string; fullName: string } | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [strategy, setStrategy] = useState<Strategy>('BALANCED');
  const [one, setOne] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { setStrategy('BALANCED'); setOne(''); setEdits({}); }, [user?.id]);
  const plan = useQuery({
    queryKey: ['handover', user?.id, strategy, one],
    queryFn: () => api.get<Plan>(`/api/assignment/handover/${user!.id}`, { strategy, ...(strategy === 'ONE' && one ? { toUserId: one } : {}) }),
    enabled: !!user && (strategy !== 'ONE' || !!one), retry: false,
  });
  // the receivers list for "all to one person" comes from a balanced plan
  const base = useQuery({ queryKey: ['handover', user?.id, 'BALANCED', ''], queryFn: () => api.get<Plan>(`/api/assignment/handover/${user!.id}`), enabled: !!user, retry: false });
  useEffect(() => setEdits({}), [strategy, one]);
  const p = plan.data ?? (strategy === 'ONE' ? undefined : base.data);
  const people = base.data?.receivers ?? [];
  const moves = (p?.moves ?? []).map((m) => ({ ...m, toUserId: edits[m.accountId] ?? m.toUserId }));
  const totals = useMemo(() => {
    const t: Record<string, { n: number; w: number }> = {};
    for (const m of moves) { t[m.toUserId] ??= { n: 0, w: 0 }; t[m.toUserId].n++; t[m.toUserId].w += Number(m.weight); }
    return t;
  }, [moves]);

  const apply = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const r = await api.post<{ moved: number; remaining: number }>(`/api/assignment/handover/${user.id}`, { moves: moves.map((m) => ({ accountId: m.accountId, toUserId: m.toUserId })) });
      toast.success(`${r.moved} account${r.moved === 1 ? '' : 's'} handed over${r.remaining ? ` · ${r.remaining} still with ${user.fullName}` : ''}`);
      ['accounts', 'users', 'report', 'capacity', 'handover', 'dashboard', 'sequences'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal open={!!user} onClose={onClose} width="max-w-3xl" title={`Hand over ${user?.fullName}'s accounts`}
      subtitle={p ? `${p.moves.length} accounts as ${p.from.role}${p.openTasks ? ` · ${p.openTasks} open tasks` : ''}${p.activeSequences ? ` · ${p.activeSequences} email sequences` : ''} move with them` : 'Working out a fair split…'}
      footer={<>
        <span className="mr-auto text-xs text-ink-muted">Open tasks, upcoming meetings and SQL credit move too. Their email sequences pause and pass to the new owner.</span>
        <Button onClick={onClose}>Not now</Button>
        <Button variant="primary" disabled={!moves.length} loading={busy} onClick={apply}>Hand over {moves.length}</Button>
      </>}>
      {(plan.error || base.error) && <p className="rounded-xl bg-canvas px-3 py-2 text-[13px] text-brand-navy">{((plan.error ?? base.error) as Error).message}</p>}
      {p && p.moves.length === 0 && <p className="py-6 text-center text-sm text-ink-muted">{user?.fullName} owns no accounts. Nothing to hand over.</p>}
      {base.data && base.data.moves.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Segmented value={strategy} onChange={setStrategy} options={[
              { value: 'BALANCED', label: <span className="flex items-center gap-1.5"><Scale className="h-3.5 w-3.5" />Balance by load</span> },
              { value: 'ROUND_ROBIN', label: <span className="flex items-center gap-1.5"><Shuffle className="h-3.5 w-3.5" />Round-robin</span> },
              { value: 'ONE', label: <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />All to one person</span> },
            ]} />
            {strategy === 'ONE' && (
              <Select value={one} onChange={(e) => setOne(e.target.value)} className="w-56">
                <option value="">Choose who takes everything…</option>
                {people.map((r) => <option key={r.userId} value={r.userId}>{r.name}</option>)}
              </Select>
            )}
          </div>
          <p className="text-xs text-ink-muted">
            {strategy === 'BALANCED' ? 'Biggest deals first, each to whoever has the lightest book at that moment. AEs: L2/L3/Negotiation count 1.5, other deals 1, inactive 0.2. BDRs: prospects 1, pipeline 0.5, inactive 0.2.'
              : strategy === 'ROUND_ROBIN' ? 'In turn, starting with whoever was handed work longest ago. Ignores current load.' : 'Everything goes to one person, for example the leaver’s replacement.'}
          </p>
          {p && (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                {people.map((r) => {
                  const t = totals[r.userId] ?? { n: 0, w: 0 };
                  return (
                    <div key={r.userId} className={cn('rounded-xl border p-3', t.n ? 'border-brand-forest/30 bg-brand-forest-50/50' : 'border-line/80')}>
                      <p className="truncate text-[13px] font-semibold">{r.name}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">+{t.n} account{t.n === 1 ? '' : 's'} · load {r.loadBefore} <ArrowRight className="inline h-3 w-3" /> {Math.round((Number(r.loadBefore) + t.w) * 10) / 10}</p>
                    </div>
                  );
                })}
              </div>
              <div className="max-h-[40vh] overflow-auto rounded-xl border border-line">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 bg-white"><tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                    <th className="px-3 py-2 font-semibold">Account</th><th className="px-3 font-semibold">Stage</th><th className="w-56 px-3 font-semibold">Goes to</th>
                  </tr></thead>
                  <tbody>
                    {moves.map((m) => (
                      <tr key={m.accountId} className="border-b border-line/60 last:border-0">
                        <td className="px-3 py-1.5"><Link to={`/accounts/${m.accountId}`} className="font-medium hover:text-brand-forest">{m.name}</Link></td>
                        <td className="px-3 text-xs text-ink-muted">{humanize(m.stage)}{m.status === 'INACTIVE' ? ' · inactive' : ''}</td>
                        <td className="px-3 py-1">
                          <Select value={m.toUserId} onChange={(e) => setEdits((x) => ({ ...x, [m.accountId]: e.target.value }))}
                            className={cn(edits[m.accountId] && 'border-brand-forest/40 font-medium')}>
                            {people.map((r) => <option key={r.userId} value={r.userId}>{r.name}</option>)}
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
