import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownUp, Bookmark, Building2, Download, Flag, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction, useDebounced } from '@/lib/hooks';
import { useCities } from '@/lib/queries';
import { cn } from '@/lib/cn';
import { fmtDate, inr, relTime } from '@/lib/format';
import type { AccountRow, LifecycleStage, Page } from '@/lib/types';
import { Avatar, Badge, Button, Card, Empty, EntityTile, Input, PageHeader, Segmented, Select, SkeletonRows } from '@/components/ui/ui';
import { usePulse } from '@/features/dashboard/pulse';
import { STAGES, StageBadge, StageMeter, StatusBadge, TemperatureBadge, stageLabel } from '@/components/ui/status';
import { Modal } from '@/components/ui/overlay';
import { AddAccountModal } from '@/features/accounts/AccountForms';

interface Filters { q: string; status: string; zone: string; stage: LifecycleStage[]; sizeBucket: string; temperature: string; cityId: string; flagged: boolean; sort: string }
const DEFAULTS: Filters = { q: '', status: 'ACTIVE', zone: '', stage: [], sizeBucket: '', temperature: '', cityId: '', flagged: false, sort: '' };
interface SavedView { id: string; name: string; entity: string; filters: string; shared: boolean }

/** Account list (M8-8): Active by default, quick filters, saved views, export. Click a row to open the account. */
export default function AccountsPage() {
  const { user, is } = useAuth();
  // deal temperature is the AE's call after L1; BDRs work prospects, where it is never set
  const showTemp = user?.role !== 'BDR';
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [f, setF] = useState<Filters>(() => ({ ...DEFAULTS, ...(params.get('v') ? JSON.parse(params.get('v')!) : {}) }));
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const cities = useCities();
  const q = useDebounced(f.q, 250);

  useEffect(() => { setPage(0); }, [q, f.status, f.zone, f.stage, f.sizeBucket, f.temperature, f.cityId, f.flagged, f.sort]);
  useEffect(() => {
    const changed = JSON.stringify(f) !== JSON.stringify(DEFAULTS);
    setParams(changed ? { v: JSON.stringify(f) } : {}, { replace: true });
  }, [f, setParams]);

  const query = useMemo(() => ({
    q, status: f.status, zone: f.zone || undefined, stage: f.stage, sizeBucket: f.sizeBucket || undefined,
    temperature: f.temperature || undefined, cityId: f.cityId || undefined, flagged: f.flagged || undefined, sort: f.sort || undefined, page, size: 50,
  }), [q, f, page]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['accounts', query], queryFn: () => api.get<Page<AccountRow>>('/api/accounts', query), placeholderData: (p) => p,
  });
  const views = useQuery({ queryKey: ['saved-views'], queryFn: () => api.get<SavedView[]>('/api/saved-views', { entity: 'ACCOUNT' }) });
  const pulse = usePulse('30');
  const mix = pulse.data?.stageMix ?? [];
  const cnt = (...st: LifecycleStage[]) => mix.filter((m) => st.includes(m.stage)).reduce((a, m) => a + Number(m.count), 0);
  const pipeMrr = mix.filter((m) => !['WON', 'LOST', 'PROSPECT'].includes(m.stage)).reduce((a, m) => a + Number(m.mrr), 0);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const activeCount = (Object.keys(DEFAULTS) as (keyof Filters)[]).filter((k) => k !== 'q' && k !== 'sort' && JSON.stringify(f[k]) !== JSON.stringify(DEFAULTS[k])).length;
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div>
      <PageHeader title="Accounts" icon={<Building2 />} eyebrow="Book of business"
        stats={[
          { label: 'Active accounts', value: cnt(...STAGES).toLocaleString('en-IN'), hint: 'Across every stage', onClick: () => setF({ ...DEFAULTS }) },
          { label: 'Prospecting', value: cnt('PROSPECT'), hint: 'Not yet an SQL', onClick: () => setF({ ...DEFAULTS, stage: ['PROSPECT'] }) },
          { label: 'In pipeline', value: cnt('SQL', 'L1', 'MULTITHREADING', 'L2', 'L3', 'NEGOTIATION'), hint: `${inr(pipeMrr)} expected MRR`, onClick: () => setF({ ...DEFAULTS, zone: 'PIPELINE' }) },
          { label: 'Won', value: cnt('WON', 'IMPLEMENTATION'), hint: 'Closed and handed over', onClick: () => setF({ ...DEFAULTS, stage: ['WON'] }) },
        ]}
        subtitle={is('BDR') ? 'Your prospects and the pipeline accounts you sourced.' : is('AE') ? 'Accounts assigned to you.' : 'Every account across the team.'}
        actions={<>
          <Button icon={<Download className="h-3.5 w-3.5" />} onClick={() => api.download('/api/accounts', { ...query, format: 'csv', page: undefined, size: undefined }, 'accounts.csv').catch((e) => toast.error(e.message))}>Export</Button>
          {(is('BDR') || is('MANAGER', 'ADMIN')) && <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAdding(true)}>New account</Button>}
        </>} />

      {(views.data?.length ?? 0) > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Bookmark className="h-3.5 w-3.5 text-ink-muted" />
          {views.data!.map((v) => (
            <button key={v.id} onClick={() => { try { setF({ ...DEFAULTS, ...JSON.parse(v.filters) }); } catch { /* bad view */ } }}
              className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft shadow-card hover:border-accent/40 hover:text-accent">
              {v.name}{v.shared && <span className="ml-1 text-ink-muted">· team</span>}
            </button>
          ))}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line/70 p-4">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-ink-muted" />
            <Input value={f.q} onChange={(e) => set('q', e.target.value)} placeholder="Search accounts…" className="rounded-full pl-10" />
          </div>
          <Segmented value={f.status} onChange={(v) => set('status', v)} options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }, { value: 'ALL', label: 'All' }]} />
          {!is('AE') && (
            <Select value={f.zone} onChange={(e) => set('zone', e.target.value)} className="w-32">
              <option value="">All zones</option><option value="PROSPECTING">Prospecting</option><option value="PIPELINE">Pipeline</option>
            </Select>
          )}
          <Select value={f.stage[0] ?? ''} onChange={(e) => set('stage', e.target.value ? [e.target.value as LifecycleStage] : [])} className="w-32">
            <option value="">All stages</option>{STAGES.map((s) => <option key={s} value={s}>{stageLabel[s]}</option>)}
          </Select>
          <Select value={f.sizeBucket} onChange={(e) => set('sizeBucket', e.target.value)} className="w-28">
            <option value="">Any size</option>{['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'].map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </Select>
          {showTemp && (
            <Select value={f.temperature} onChange={(e) => set('temperature', e.target.value)} className="w-28">
              <option value="">Any temp.</option><option value="HOT">Hot</option><option value="WARM">Warm</option><option value="COLD">Cold</option>
            </Select>
          )}
          <Select value={f.cityId} onChange={(e) => set('cityId', e.target.value)} className="w-32">
            <option value="">Any city</option>{cities.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Button size="sm" variant={f.flagged ? 'subtle' : 'ghost'} icon={<Flag className="h-3.5 w-3.5" />} onClick={() => set('flagged', !f.flagged)}>Flagged</Button>
          <div className="ml-auto flex items-center gap-1.5">
            {activeCount > 0 && <Button size="sm" variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => setF({ ...DEFAULTS, q: f.q })}>Clear</Button>}
            {activeCount > 0 && <Button size="sm" icon={<Bookmark className="h-3.5 w-3.5" />} onClick={() => setSaving(true)}>Save view</Button>}
            <Select value={f.sort} onChange={(e) => set('sort', e.target.value)} className="h-8 w-44">
              <option value="">Newest first</option><option value="name">Name A–Z</option><option value="lastActivity">Least recently touched</option><option value="nextStepDue">Next step due</option>
            </Select>
            <ArrowDownUp className="h-3.5 w-3.5 text-ink-muted" />
          </div>
        </div>

        {isLoading ? <SkeletonRows rows={8} /> : !data?.items.length ? (
          <Empty icon={<Building2 className="h-5 w-5" />} title="No accounts match" body="Try clearing a filter, or add a new account."
            action={is('BDR') ? <Button variant="primary" onClick={() => setAdding(true)} icon={<Plus className="h-3.5 w-3.5" />}>New account</Button> : undefined} />
        ) : (
          <>
          <ul className={cn('space-y-2 p-2 md:hidden', isFetching && 'opacity-70')}>
            {data.items.map((a) => {
              const overdue = a.nextStepDue && a.nextStepDue < new Date().toISOString().slice(0, 10);
              return (
                <li key={a.id}>
                  <button onClick={() => navigate(`/accounts/${a.id}`)} className="w-full rounded-[18px] border border-line/70 bg-white p-3.5 text-left transition-all active:scale-[.99] active:border-brand-forest/30">
                    <div className="flex items-start gap-3">
                      <EntityTile name={a.name} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold">{a.name}{a.flaggedForReview && <Flag className="h-3 w-3 shrink-0 text-warning" />}</p>
                        <p className="truncate text-[11.5px] text-ink-muted">{[a.city, a.sizeBucket && a.sizeBucket.toLowerCase(), a.licensePotential && `${a.licensePotential} licences`].filter(Boolean).join(' · ')}</p>
                      </div>
                      {a.expectedMrr ? <span className="shrink-0 font-display text-[15px] font-medium tabular-nums text-brand-forest">{inr(a.expectedMrr)}</span> : null}
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5"><StageBadge stage={a.stage} />{a.status === 'INACTIVE' && <StatusBadge status="INACTIVE" />}{showTemp && <TemperatureBadge t={a.temperature} />}</div>
                    <div className="mt-2"><StageMeter stage={a.stage} /></div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line/60 pt-2.5 text-[11.5px]">
                      <span className="min-w-0 truncate text-ink-soft">
                        {a.status === 'INACTIVE' ? a.inactiveReason : a.nextStep ? <><span className={cn('font-semibold', overdue ? 'text-brand-navy' : 'text-brand-forest')}>{fmtDate(a.nextStepDue)}</span> · {a.nextStep}</> : a.zone === 'PIPELINE' ? <span className="font-semibold text-brand-navy">No next step</span> : '—'}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-ink-muted"><span className={cn('h-1.5 w-1.5 rounded-full', a.lastActivityAt && Date.now() - new Date(a.lastActivityAt).getTime() < 3 * 864e5 ? 'bg-brand-mint' : 'bg-brand-forest/30')} />{relTime(a.lastActivityAt)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={cn('hidden overflow-x-auto transition-opacity md:block', isFetching && 'opacity-70')}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">Account</th><th className="px-3 font-medium">Stage</th><th className="px-3 font-medium">Owner</th>
                  {showTemp && <th className="px-3 font-medium" title="Deal temperature set by the AE: how likely the deal is to close">Temp.</th>}<th className="px-3 text-right font-medium">MRR</th><th className="px-3 font-medium">Next step</th>
                  <th className="px-4 text-right font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => {
                  const overdue = a.nextStepDue && a.nextStepDue < new Date().toISOString().slice(0, 10);
                  return (
                    <tr key={a.id} onClick={() => navigate(`/accounts/${a.id}`)} className="group cursor-pointer border-b border-line/70 last:border-0 hover:bg-canvas">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <EntityTile name={a.name} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold transition-colors group-hover:text-brand-forest">
                              {a.name}{a.flaggedForReview && <Flag className="h-3 w-3 text-warning" />}
                            </p>
                            <p className="truncate text-2xs text-ink-muted">{[a.city, a.sizeBucket && a.sizeBucket.toLowerCase(), a.licensePotential && `${a.licensePotential} licenses`].filter(Boolean).join(' · ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3"><div className="flex flex-col gap-1.5"><div className="flex items-center gap-1.5"><StageBadge stage={a.stage} />{a.status === 'INACTIVE' && <StatusBadge status="INACTIVE" />}</div><StageMeter stage={a.stage} /></div></td>
                      <td className="px-3">
                        <div className="flex items-center -space-x-1" title={[a.aeOwner && `AE: ${a.aeOwner}`, a.bdrs && `BDR: ${a.bdrs}`].filter(Boolean).join('\n')}>
                          {a.aeOwner && <Avatar name={a.aeOwner} className="ring-2 ring-white" />}
                          {a.bdrs?.split(', ').slice(0, 2).map((b) => <Avatar key={b} name={b} className="ring-2 ring-white" />)}
                          {!a.aeOwner && !a.bdrs && <span className="text-ink-muted">—</span>}
                        </div>
                      </td>
                      {showTemp && <td className="px-3"><TemperatureBadge t={a.temperature} /></td>}
                      <td className="px-3 text-right">{a.expectedMrr ? <span className="font-display text-[15px] font-medium tabular-nums">{inr(a.expectedMrr)}</span> : <span className="text-ink-muted">—</span>}</td>
                      <td className="max-w-[220px] px-3">
                        {a.status === 'INACTIVE' ? <span className="text-xs text-ink-muted">{a.inactiveReason}{a.revisitOn && ` · revisit ${fmtDate(a.revisitOn)}`}</span>
                          : a.nextStep ? <p className="truncate text-xs"><span className={cn('font-semibold', overdue ? 'text-brand-navy' : 'text-brand-forest')}>{fmtDate(a.nextStepDue)}</span> · {a.nextStep}</p>
                          : a.zone === 'PIPELINE' ? <Badge tone="warning">No next step</Badge> : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 text-right text-xs text-ink-muted"><span className="inline-flex items-center gap-1.5"><span className={cn('h-1.5 w-1.5 rounded-full', !a.lastActivityAt ? 'bg-black/15' : Date.now() - new Date(a.lastActivityAt).getTime() < 3 * 864e5 ? 'bg-brand-mint' : Date.now() - new Date(a.lastActivityAt).getTime() < 14 * 864e5 ? 'bg-brand-forest/50' : 'bg-black/20')} />{relTime(a.lastActivityAt)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-xs text-ink-muted">
            <span>{total.toLocaleString('en-IN')} accounts{user?.role === 'BDR' ? ' you can see' : ''}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <span>Page {page + 1} of {pages}</span>
              <Button size="sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      <AddAccountModal open={adding} onClose={() => setAdding(false)} />
      <SaveViewModal open={saving} onClose={() => setSaving(false)} filters={f} canShare={is('MANAGER', 'ADMIN')} />
    </div>
  );
}

function SaveViewModal({ open, onClose, filters, canShare }: { open: boolean; onClose: () => void; filters: Filters; canShare: boolean }) {
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  useEffect(() => { if (open) { setName(''); setShared(false); } }, [open]);
  const save = useAction(() => api.post('/api/saved-views', { name, entity: 'ACCOUNT', filters: JSON.stringify({ ...filters, q: '' }), shared }), {
    success: 'View saved', invalidate: [['saved-views']], onSuccess: onClose,
  });
  return (
    <Modal open={open} onClose={onClose} title="Save this view" width="max-w-sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim()} loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button></>}>
      <div className="space-y-3">
        <Input autoFocus placeholder="e.g. Hot Bengaluru deals" value={name} onChange={(e) => setName(e.target.value)} />
        {canShare && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" className="accent-accent" checked={shared} onChange={(e) => setShared(e.target.checked)} />Share with the team</label>}
      </div>
    </Modal>
  );
}
