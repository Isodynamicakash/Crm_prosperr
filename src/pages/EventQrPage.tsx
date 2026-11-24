import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Copy, Download, Maximize2, Plus, QrCode, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/hooks';
import { relTime } from '@/lib/format';
import { Modal } from '@/components/ui/overlay';
import { Badge, Button, Card, Empty, Field, Input, PageHeader, SkeletonRows, Switch } from '@/components/ui/ui';

interface Qr { id: string; token: string; eventName: string; sendWelcome: boolean; active: boolean; createdAt: string; ownerId: string; ownerName: string;
  captured: number; created: number; existing: number; review: number }
interface Capture { id: string; fullName: string; company: string; designation?: string; email: string; phone?: string; outcome: 'CREATED' | 'EXISTING' | 'REVIEW';
  reviewReason?: string; welcomeSent: boolean; createdAt: string; accountId?: string; stakeholderId?: string; accountName?: string }

const link = (token: string) => `${window.location.origin}/q/${token}`;

function useQrImage(token: string, size: number) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(link(token), { width: size, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0B3D2C', light: '#FFFFFF' } })
      .then(setSrc).catch(() => setSrc(null));
  }, [token, size]);
  return src;
}

/** Event lead capture: each BDR's own QR. A prospect scans it, fills a short form, and lands in the BDR's accounts. */
export default function EventQrPage() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['lead-qr'], queryFn: () => api.get<Qr[]>('/api/lead-qr'), refetchInterval: 30_000 });
  const [creating, setCreating] = useState(false);
  const rows = q.data ?? [];
  const sum = (k: 'captured' | 'created' | 'existing') => rows.reduce((a, r) => a + r[k], 0);
  return (
    <div>
      <PageHeader title="Event QR" icon={<QrCode />} eyebrow="Lead capture"
        subtitle="Show your QR at an event. People scan it with their phone, fill a short form, and land in your accounts with a follow-up task."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>New event QR</Button>}
        stats={[
          { label: 'Leads captured', value: sum('captured'), hint: 'All events' },
          { label: 'New contacts', value: sum('created'), hint: 'Added to your accounts' },
          { label: 'Already in CRM', value: sum('existing'), hint: 'Matched, not duplicated' },
        ]} />
      {q.isLoading ? <SkeletonRows /> : rows.length === 0 ? (
        <Card><Empty icon={<QrCode className="h-5 w-5" />} title="No event QR yet" body="Make one before the event: give it the event's name, then show it on your phone or print it."
          action={<Button variant="primary" onClick={() => setCreating(true)}>New event QR</Button>} /></Card>
      ) : (
        <div className="space-y-4">{rows.map((r) => <QrCard key={r.id} qr={r} showOwner={user?.role !== 'BDR'} />)}</div>
      )}
      <NewQrModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function NewQrModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [welcome, setWelcome] = useState(true);
  const create = useAction(() => api.post('/api/lead-qr', { eventName: name, sendWelcome: welcome }),
    { success: 'QR ready', invalidate: [['lead-qr']], onSuccess: () => { setName(''); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="New event QR" subtitle="One QR per event, so you can see which event brought which leads."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim()} loading={create.isPending} onClick={() => create.mutate(undefined)}>Create QR</Button></>}>
      <div className="space-y-4">
        <Field label="Event name" required hint="People see this on the form, e.g. 'HR Tech Summit, Mumbai'">
          <Input id="qr-event" autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) create.mutate(undefined); }} />
        </Field>
        <div className="flex items-center gap-3 text-[13px]"><Switch checked={welcome} onChange={setWelcome} label="Welcome email" />
          Send a "great meeting you" email from my Gmail right after they submit</div>
        <p className="text-xs text-ink-muted">The email only goes to new contacts, and only if your Google account is connected. People already in the CRM are matched, never emailed twice.</p>
      </div>
    </Modal>
  );
}

function QrCard({ qr, showOwner }: { qr: Qr; showOwner: boolean }) {
  const img = useQrImage(qr.token, 360);
  const [big, setBig] = useState(false);
  const [open, setOpen] = useState(false);
  const patch = useAction((b: { active?: boolean; sendWelcome?: boolean }) => api.patch(`/api/lead-qr/${qr.id}`, b), { invalidate: [['lead-qr']] });
  const copy = async () => { try { await navigator.clipboard.writeText(link(qr.token)); toast.success('Link copied'); } catch { toast.error('Could not copy'); } };
  const file = `prosperr-qr-${qr.eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-4">
        <button type="button" onClick={() => setBig(true)} className="shrink-0 rounded-xl border border-line bg-white p-2" title="Show full screen" disabled={!qr.active}>
          {img ? <img src={img} alt={`QR for ${qr.eventName}`} className={qr.active ? 'h-32 w-32' : 'h-32 w-32 opacity-25'} /> : <div className="h-32 w-32" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold">{qr.eventName}</h3>
            {!qr.active && <Badge>Switched off</Badge>}
          </div>
          <p className="text-xs text-ink-muted">{showOwner ? `${qr.ownerName} · ` : ''}made {relTime(qr.createdAt)}</p>
          <p className="mt-2 text-[13px]"><b className="tabular-nums">{qr.captured}</b> leads · {qr.created} new · {qr.existing} already in CRM{qr.review ? <> · <b className="text-brand-navy">{qr.review} to check</b></> : null}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" icon={<Maximize2 className="h-3.5 w-3.5" />} disabled={!qr.active} onClick={() => setBig(true)}>Show full screen</Button>
            {img && <a href={img} download={file}><Button size="sm" icon={<Download className="h-3.5 w-3.5" />}>Download</Button></a>}
            <Button size="sm" variant="ghost" icon={<Copy className="h-3.5 w-3.5" />} onClick={copy}>Copy link</Button>
            <Button size="sm" variant="ghost" icon={<Users className="h-3.5 w-3.5" />} onClick={() => setOpen(!open)}>{open ? 'Hide leads' : 'See leads'}</Button>
          </div>
        </div>
        <div className="w-full space-y-2 sm:w-64">
          <div className="flex items-center gap-3 text-[13px]"><Switch checked={qr.active} disabled={patch.isPending} onChange={(v) => patch.mutate({ active: v })} label="QR is live" />QR is live</div>
          <div className="flex items-center gap-3 text-[13px]"><Switch checked={qr.sendWelcome} disabled={patch.isPending} onChange={(v) => patch.mutate({ sendWelcome: v })} label="Welcome email" />Welcome email</div>
        </div>
      </div>
      {open && <Captures qrId={qr.id} />}
      <Modal open={big} onClose={() => setBig(false)} width="max-w-md" title={qr.eventName} subtitle="Scan with your phone camera to share your details with Prosperr">
        <BigQr token={qr.token} />
      </Modal>
    </Card>
  );
}

function BigQr({ token }: { token: string }) {
  const img = useQrImage(token, 720);
  return img ? <img src={img} alt="QR code" className="mx-auto w-full max-w-sm" /> : null;
}

const OUTCOME: Record<Capture['outcome'], { label: string; tone: 'success' | 'info' | 'warning' }> = {
  CREATED: { label: 'New contact', tone: 'success' }, EXISTING: { label: 'Already in CRM', tone: 'info' }, REVIEW: { label: 'Check this', tone: 'warning' },
};

function Captures({ qrId }: { qrId: string }) {
  const q = useQuery({ queryKey: ['lead-qr', qrId, 'captures'], queryFn: () => api.get<Capture[]>(`/api/lead-qr/${qrId}/captures`) });
  if (q.isLoading) return <div className="mt-4"><SkeletonRows rows={2} /></div>;
  const rows = q.data ?? [];
  if (!rows.length) return <p className="mt-4 border-t border-line pt-3 text-[13px] text-ink-muted">No one has filled the form yet.</p>;
  return (
    <ul className="mt-4 divide-y divide-line/70 border-t border-line">
      {rows.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            {c.accountId
              ? <Link to={`/accounts/${c.accountId}${c.stakeholderId ? `?stakeholder=${c.stakeholderId}` : ''}`} className="font-semibold hover:text-brand-forest">{c.fullName}</Link>
              : <span className="font-semibold">{c.fullName}</span>}
            <p className="truncate text-xs text-ink-muted">{[c.designation, c.accountName ?? c.company, c.email, c.phone].filter(Boolean).join(' · ')}</p>
            {c.outcome === 'REVIEW' && <p className="text-xs text-brand-navy">{c.reviewReason} Add them from Accounts.</p>}
          </div>
          <div className="text-right">
            <Badge tone={OUTCOME[c.outcome].tone}>{OUTCOME[c.outcome].label}</Badge>
            <p className="mt-0.5 text-[11px] text-ink-muted">{relTime(c.createdAt)}{c.welcomeSent ? ' · welcome email sent' : ''}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
