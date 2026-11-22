import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, UserCheck, UserX, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { useUsers } from '@/lib/queries';
import { humanize, relTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Role, UserView } from '@/lib/types';
import { Avatar, Badge, Button, Card, Empty, Field, Input, PageHeader, Select, SkeletonRows } from '@/components/ui/ui';
import { Confirm, Modal } from '@/components/ui/overlay';

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: 'BDR', label: 'BDR', hint: 'Prospects, calls, submits SQLs' },
  { value: 'AE', label: 'AE', hint: 'Runs meetings and closes deals' },
  { value: 'MANAGER', label: 'Sales manager', hint: 'Validates SQLs, assigns AEs, sees everything' },
  { value: 'ADMIN', label: 'Admin', hint: 'Manages users, roles and settings' },
];

/** Only the admin creates people and decides their role; everyone then signs in with Google. */
export default function TeamPage() {
  const { is, user: me } = useAuth();
  const admin = is('ADMIN');
  const { data, isLoading } = useUsers();
  const [editing, setEditing] = useState<UserView | 'new' | null>(null);
  const [deactivate, setDeactivate] = useState<UserView | null>(null);
  const [owned, setOwned] = useState<{ user: UserView; rows: { accountId: string; name: string; ownership: string; stage: string }[] } | null>(null);
  const activate = useAction((id: string) => api.post(`/api/admin/users/${id}/activate`), { success: 'User reactivated', invalidate: [['users']] });
  const doDeactivate = useAction((u: UserView) => api.post<{ accountId: string; name: string; ownership: string; stage: string }[]>(`/api/admin/users/${u.id}/deactivate`).then((rows) => ({ u, rows })), {
    success: 'User deactivated — they can no longer sign in', invalidate: [['users']],
    onSuccess: ({ u, rows }) => { setDeactivate(null); if (rows.length) setOwned({ user: u, rows }); },
  });

  const grouped = ROLES.map((r) => ({ ...r, users: (data ?? []).filter((u) => u.role === r.value) }));

  return (
    <div>
      <PageHeader title="Team" icon={<Users />} eyebrow="People & access"
        subtitle={`${data?.filter((u) => u.active).length ?? 0} active people. Everyone signs in with their Prosperr Google account.`}
        actions={admin && <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setEditing('new')}>Add person</Button>}
        stats={ROLES.map((r) => ({ label: r.label, value: (data ?? []).filter((u) => u.role === r.value && u.active).length, hint: r.hint }))} />
      {isLoading ? <Card><SkeletonRows /></Card> : !data?.length ? <Card><Empty icon={<Users className="h-5 w-5" />} title="No one here yet" /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {grouped.flatMap((g) => g.users).map((u) => (
            <div key={u.id} className={cn('group relative overflow-hidden rounded-[22px] border bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-26px_rgba(5,63,26,.6)]',
              u.active ? 'border-line/80 hover:border-brand-forest/25' : 'border-line/60 opacity-70')}>
              <span className={cn('absolute inset-x-0 top-0 h-1', u.role === 'ADMIN' ? 'bg-brand-navy' : u.role === 'MANAGER' ? 'bg-brand-forest' : u.role === 'AE' ? 'bg-brand-mint' : 'bg-[#7CCB8E]')} />
              <div className="flex items-start gap-3">
                <Avatar name={u.fullName} size="md" className="h-11 w-11 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[16px] font-medium tracking-[-0.02em]">{u.fullName}{u.id === me?.id && <span className="ml-1 text-[12px] font-normal text-ink-muted">(you)</span>}</p>
                  <p className="truncate text-[12px] text-ink-muted">{u.email}</p>
                </div>
                {u.active ? <Badge tone="success" dot>Active</Badge> : <Badge dot>Deactivated</Badge>}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3 text-[12px]">
                <span className="rounded-full bg-brand-forest-50 px-2.5 py-1 font-semibold text-brand-forest">{ROLES.find((r) => r.value === u.role)?.label}</span>
                <span className="text-ink-muted">Signed in {u.lastLoginAt ? relTime(u.lastLoginAt) : 'never'}</span>
              </div>
              {admin && u.id !== me?.id && (
                <div className="mt-3 flex gap-1.5">
                  <Button size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(u)}>Edit</Button>
                  {u.active ? <Button size="sm" variant="ghost" icon={<UserX className="h-3.5 w-3.5" />} onClick={() => setDeactivate(u)}>Deactivate</Button>
                    : <Button size="sm" variant="ghost" icon={<UserCheck className="h-3.5 w-3.5" />} onClick={() => activate.mutate(u.id)}>Reactivate</Button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <UserModal user={editing} onClose={() => setEditing(null)} managers={(data ?? []).filter((u) => u.role === 'MANAGER' && u.active)} />
      <Confirm open={!!deactivate} onClose={() => setDeactivate(null)} danger confirmLabel="Deactivate" loading={doDeactivate.isPending}
        onConfirm={() => deactivate && doDeactivate.mutate(deactivate)} title={`Deactivate ${deactivate?.fullName}?`}
        body="They lose access immediately. You’ll see the accounts they own so you can reassign them. Their history stays." />
      <Modal open={!!owned} onClose={() => setOwned(null)} title={`${owned?.user.fullName} owned ${owned?.rows.length} accounts`} subtitle="Open each one to reassign it." width="max-w-xl"
        footer={<Button onClick={() => setOwned(null)}>Done</Button>}>
        <ul className="divide-y divide-line rounded-lg border border-line">
          {owned?.rows.map((r) => (
            <li key={r.accountId} className="flex items-center justify-between px-3 py-2 text-[13px]">
              <Link to={`/accounts/${r.accountId}`} className="font-medium hover:text-accent">{r.name}</Link>
              <span className="text-xs text-ink-muted">{humanize(r.ownership)} · {humanize(r.stage)}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}

function UserModal({ user, onClose, managers }: { user: UserView | 'new' | null; onClose: () => void; managers: UserView[] }) {
  const isNew = user === 'new';
  const [f, setF] = useState({ email: '', fullName: '', phone: '', role: 'BDR' as Role, managerId: '' });
  useEffect(() => {
    if (user && user !== 'new') setF({ email: user.email, fullName: user.fullName, phone: user.phone ?? '', role: user.role, managerId: user.managerId ?? '' });
    else if (user === 'new') setF({ email: '', fullName: '', phone: '', role: 'BDR', managerId: '' });
  }, [user]);
  const save = useAction(() => isNew
    ? api.post('/api/admin/users', { email: f.email.trim(), fullName: f.fullName.trim(), phone: f.phone || null, role: f.role, managerId: f.managerId || null })
    : api.patch(`/api/admin/users/${(user as UserView).id}`, { fullName: f.fullName.trim(), phone: f.phone || null, role: f.role, managerId: f.managerId || null }), {
    success: isNew ? 'Person added — they can now sign in with Google' : 'Saved', invalidate: [['users']], onSuccess: onClose,
  });
  return (
    <Modal open={!!user} onClose={onClose} title={isNew ? 'Add person' : 'Edit person'} subtitle={isNew ? 'They sign in with this Google account. The role decides what they see.' : undefined}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!f.fullName.trim() || (isNew && !f.email.trim())} loading={save.isPending} onClick={() => save.mutate(undefined)}>{isNew ? 'Add person' : 'Save'}</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name" required><Input autoFocus value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <Field label="Work email" required hint="@prosperr.io Google account"><Input type="email" disabled={!isNew} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Phone" hint="Used in email signatures"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Reports to">
          <Select value={f.managerId} onChange={(e) => setF({ ...f, managerId: e.target.value })}><option value="">—</option>{managers.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</Select>
        </Field>
        <div className="col-span-2">
          <p className="mb-1.5 text-xs font-medium text-ink-soft">Role</p>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button key={r.value} onClick={() => setF({ ...f, role: r.value })}
                className={`rounded-lg border px-3 py-2 text-left transition-all ${f.role === r.value ? 'border-accent bg-accent-soft/60 ring-1 ring-accent/30' : 'border-line hover:border-ink-muted/30'}`}>
                <p className="text-[13px] font-medium">{r.label}</p><p className="text-2xs text-ink-muted">{r.hint}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
