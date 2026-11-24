import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Logo } from '@/components/brand/Logo';
import { Button, Checkbox, Field, Input } from '@/components/ui/ui';

/** What a prospect sees after scanning a BDR's QR at an event. Public: no sign-in, no CRM data shown. */
export default function PublicLeadPage() {
  const { token = '' } = useParams();
  const info = useQuery({ queryKey: ['public-qr', token], retry: false,
    queryFn: () => api.get<{ eventName: string; repName: string }>(`/public/qr/${encodeURIComponent(token)}`) });
  const [f, setF] = useState({ fullName: '', company: '', designation: '', email: '', phone: '', website: '' });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api.post(`/public/qr/${encodeURIComponent(token)}`, { ...f, consent });
      setDone(true);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-full bg-canvas px-4 py-8">
      <div className="mx-auto max-w-md">
        <Logo className="mb-6" />
        {info.isLoading ? (
          <div className="flex justify-center py-16 text-ink-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : info.isError ? (
          <div className="rounded-2xl border border-line bg-white p-6 text-center">
            <p className="text-[15px] font-semibold">This QR code is no longer active</p>
            <p className="mt-1 text-sm text-ink-muted">Please ask the Prosperr team at the event for a new one.</p>
          </div>
        ) : done ? (
          <div className="rounded-2xl border border-line bg-white p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-brand-forest" />
            <p className="mt-3 text-lg font-semibold">Thank you, {f.fullName.split(/\s+/)[0]}!</p>
            <p className="mt-1 text-sm text-ink-muted">{info.data!.repName} from Prosperr will be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-forest">{info.data!.eventName}</p>
            <h1 className="mt-1 text-xl font-semibold">Share your details with {info.data!.repName}</h1>
            <p className="mt-1 text-sm text-ink-muted">Prosperr helps companies raise employees' in-hand salary with a compliant Flexible Benefits Plan, at no extra payroll cost.</p>
            <div className="mt-5 space-y-3">
              <Field label="Your name" required><Input id="lead-name" autoComplete="name" value={f.fullName} onChange={set('fullName')} required maxLength={80} /></Field>
              <Field label="Company" required><Input id="lead-company" autoComplete="organization" value={f.company} onChange={set('company')} required maxLength={120} /></Field>
              <Field label="Job title"><Input id="lead-title" autoComplete="organization-title" value={f.designation} onChange={set('designation')} maxLength={100} /></Field>
              <Field label="Work email" required><Input id="lead-email" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set('email')} required /></Field>
              <Field label="Phone"><Input id="lead-phone" type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
              {/* hidden from people; bots fill it and are ignored */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')}
                className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              <Checkbox checked={consent} onChange={setConsent}
                label={<span className="text-[13px]">Prosperr may contact me by email and phone about its products. I can opt out at any time.</span>} />
            </div>
            {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
            <Button type="submit" variant="primary" className="mt-5 w-full" loading={busy} disabled={!consent || busy}>Send my details</Button>
          </form>
        )}
      </div>
    </div>
  );
}
