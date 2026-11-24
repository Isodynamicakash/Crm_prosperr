import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';

type Query = Parameters<typeof api.get>[1];
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/ui';

/** One person who manages visible accounts, as `/api/accounts/owners` returns them. */
export interface AccountOwner {
  userId: string; name: string; role: string; active: boolean;
  /** AE = owns the deal (ae_owner_id); BDR = works the account (sourcer or contributor). */
  ownsAs: 'AE' | 'BDR';
  accounts: number; pipeline: number;
}

/** Filter value: "AE:<userId>" or "BDR:<userId>"; empty = everyone. */
export const ownerKey = (o: Pick<AccountOwner, 'ownsAs' | 'userId'>) => `${o.ownsAs}:${o.userId}`;

/** Turns the filter value into the list API's aeId / bdrId params. */
export function ownerParams(value: string): { aeId?: string; bdrId?: string } {
  const [kind, id] = value.split(':');
  if (!id) return {};
  return kind === 'AE' ? { aeId: id } : { bdrId: id };
}

const ROLE_LABEL: Record<string, string> = { AE: 'Account Executive', BDR: 'BDR', MANAGER: 'Manager', ADMIN: 'Admin' };

export function useAccountOwners(filters: NonNullable<Query>, enabled = true) {
  return useQuery({
    queryKey: ['account-owners', filters],
    queryFn: () => api.get<AccountOwner[]>('/api/accounts/owners', filters),
    enabled, staleTime: 30_000, placeholderData: (p) => p,
  });
}

/**
 * "Managed by" strip on the Accounts page: everyone who owns or works the accounts in view, with their position
 * and how many accounts they have under the current filters. Click a person to see only their accounts.
 */
export function ManagedByStrip({ owners, value, onChange, loading }: {
  owners: AccountOwner[] | undefined; value: string; onChange: (v: string) => void; loading?: boolean;
}) {
  const aes = owners?.filter((o) => o.ownsAs === 'AE') ?? [];
  const bdrs = owners?.filter((o) => o.ownsAs === 'BDR') ?? [];
  if (!loading && !aes.length && !bdrs.length) return null;

  const chip = (o: AccountOwner) => {
    const k = ownerKey(o), on = value === k;
    return (
      <button key={k} type="button" onClick={() => onChange(on ? '' : k)} aria-pressed={on}
        title={`${o.name} · ${ROLE_LABEL[o.ownsAs]}${o.active ? '' : ' (inactive user)'}\n${o.accounts} accounts, ${o.pipeline} in pipeline`}
        className={cn('flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all',
          on ? 'border-brand-forest bg-brand-forest-50 shadow-card ring-2 ring-brand-forest/15' : 'border-line bg-white hover:border-brand-forest/40 hover:shadow-card',
          !o.active && 'opacity-60')}>
        <Avatar name={o.name} size="md" />
        <span className="min-w-0">
          <span className="block max-w-[140px] truncate text-[13px] font-semibold text-ink">{o.name}</span>
          <span className="block text-[11px] text-ink-muted">{ROLE_LABEL[o.ownsAs]}{!o.active && ' · left'}</span>
        </span>
        <span className={cn('ml-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums', on ? 'bg-brand-forest text-white' : 'bg-canvas text-ink-soft')}>
          {o.accounts.toLocaleString('en-IN')}
        </span>
      </button>
    );
  };

  const group = (label: string, list: AccountOwner[]) => list.length > 0 && (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</span>
      <div className="flex gap-2 overflow-x-auto pb-1">{list.map(chip)}</div>
    </div>
  );

  return (
    <div className="space-y-2 border-b border-line/70 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft"><Users className="h-3.5 w-3.5" />Managed by</p>
        {value && <button type="button" onClick={() => onChange('')} className="text-xs font-medium text-brand-forest hover:underline">Show everyone</button>}
      </div>
      {loading && !owners ? (
        <div className="flex gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 w-44 animate-pulse rounded-xl bg-canvas" />)}</div>
      ) : (
        <>
          {group('AE', aes)}
          {group('BDR', bdrs)}
        </>
      )}
    </div>
  );
}