import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Copy, Download, FileImage, Maximize2, Plus, QrCode, Users, X } from 'lucide-react';
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
  const ownerFirst = qr.ownerName.split(/\s+/)[0];
  const [big, setBig] = useState(false);
  const [open, setOpen] = useState(false);
  const patch = useAction((b: { active?: boolean; sendWelcome?: boolean }) => api.patch(`/api/lead-qr/${qr.id}`, b), { invalidate: [['lead-qr']] });
  const copy = async () => { try { await navigator.clipboard.writeText(link(qr.token)); toast.success('Link copied'); } catch { toast.error('Could not copy'); } };
  const file = `prosperr-qr-${qr.eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-4">
        <button type="button" onClick={() => setBig(true)} className="mx-auto shrink-0 self-start rounded-xl border border-line bg-white p-2 sm:mx-0" title="Show full screen" disabled={!qr.active}>
          {img ? <img src={img} alt={`QR for ${qr.eventName}`} className={qr.active ? 'h-44 w-44 sm:h-32 sm:w-32' : 'h-44 w-44 opacity-25 sm:h-32 sm:w-32'} /> : <div className="h-44 w-44 sm:h-32 sm:w-32" />}
        </button>
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold">{qr.eventName}</h3>
            {!qr.active && <Badge>Switched off</Badge>}
          </div>
          <p className="text-xs text-ink-muted">{showOwner ? `${qr.ownerName} · ` : ''}made {relTime(qr.createdAt)}</p>
          <p className="mt-2 text-[13px]"><b className="tabular-nums">{qr.captured}</b> leads · {qr.created} new · {qr.existing} already in CRM{qr.review ? <> · <b className="text-brand-navy">{qr.review} to check</b></> : null}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" icon={<Maximize2 className="h-3.5 w-3.5" />} disabled={!qr.active} onClick={() => setBig(true)}>Show full screen</Button>
            <Button size="sm" icon={<FileImage className="h-3.5 w-3.5" />} onClick={() => void poster(qr, ownerFirst).catch(() => toast.error('Could not make the poster'))}>Poster to print</Button>
            {img && <a href={img} download={file}><Button size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />}>QR only</Button></a>}
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
      {big && <BoothScreen qr={qr} rep={ownerFirst} onClose={() => setBig(false)} />}
    </Card>
  );
}

/**
 * The booth view: the whole screen becomes the QR with the event and the rep's name, the screen stays awake, and new
 * leads pop up as they arrive, so the BDR can hold up the phone or leave a tablet on the table.
 */
function BoothScreen({ qr, rep, onClose }: { qr: Qr; rep: string; onClose: () => void }) {
  const img = useQrImage(qr.token, 900);
  const live = useQuery({ queryKey: ['lead-qr'], queryFn: () => api.get<Qr[]>('/api/lead-qr'), refetchInterval: 10_000 });
  const count = live.data?.find((x) => x.id === qr.id)?.captured ?? qr.captured;
  const [start] = useState(count);
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => { /* not supported: the screen may dim */ });
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    document.documentElement.requestFullscreen?.().catch(() => { /* fine: the overlay already covers the page */ });
    return () => {
      void lock?.release().catch(() => {});
      window.removeEventListener('keydown', esc);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 overflow-auto bg-white px-6 py-8 text-center">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-line text-ink-muted hover:bg-canvas"><X className="h-5 w-5" /></button>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-forest">{qr.eventName}</p>
      <h2 className="font-display text-[26px] font-medium leading-tight sm:text-[34px]">Scan to share your details<br className="hidden sm:block" /> with {rep} from Prosperr</h2>
      {img && <img src={img} alt="QR code" className="w-[min(78vw,62vh)] max-w-[520px]" />}
      <p className="max-w-md text-[14px] text-ink-muted">Open your phone camera and point it at the code. Takes 20 seconds: name, company, work email.</p>
      <p className="text-[13px] font-semibold text-brand-forest">{count - start > 0 ? `${count - start} new lead${count - start === 1 ? '' : 's'} while this screen was open` : 'Waiting for the first scan…'}</p>
    </div>
  );
}

/** A printable A5 poster: event, call to action, the QR and the rep's name, as a PNG. */
async function poster(qr: Qr, rep: string) {
  const W = 1240, H = 1748;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#053F1A'; g.fillRect(0, 0, W, 300);
  g.fillStyle = '#FFFFFF'; g.font = '700 64px Helvetica, Arial, sans-serif'; g.textAlign = 'center';
  g.fillText('PROSPERR.IO', W / 2, 150);
  g.font = '400 34px Helvetica, Arial, sans-serif'; g.fillStyle = '#CDEBD5';
  g.fillText(qr.eventName.toUpperCase(), W / 2, 225);
  g.fillStyle = '#0D0D0D'; g.font = '600 62px Helvetica, Arial, sans-serif';
  g.fillText('Raise your team’s in-hand salary', W / 2, 430);
  g.fillText('at no extra payroll cost', W / 2, 510);
  g.font = '400 36px Helvetica, Arial, sans-serif'; g.fillStyle = '#56705F';
  g.fillText(`Scan to share your details with ${rep}`, W / 2, 590);
  const url = await QRCode.toDataURL(link(qr.token), { width: 820, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0B3D2C', light: '#FFFFFF' } });
  const im = new Image();
  await new Promise<void>((res, rej) => { im.onload = () => res(); im.onerror = () => rej(new Error('qr')); im.src = url; });
  g.drawImage(im, (W - 820) / 2, 660, 820, 820);
  g.font = '400 32px Helvetica, Arial, sans-serif'; g.fillStyle = '#56705F';
  g.fillText('Open your phone camera and point it at the code', W / 2, 1560);
  g.fillStyle = '#23B24A'; g.fillRect(0, H - 40, W, 40);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = `prosperr-poster-${qr.eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  a.click();
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
