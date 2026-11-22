import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/brand/Logo';
import { Button, Field, Input } from '@/components/ui/ui';

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (o: object) => void; renderButton: (el: HTMLElement, o: object) => void } } };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const DEV_LOGIN = (import.meta.env.VITE_DEV_LOGIN ?? 'true') !== 'false';

/** Google sign-in (PRD). Access is decided by the admin: only users they created, on the company domain, get in. */
export default function LoginPage() {
  const { signInWithGoogle, devSignIn } = useAuth();
  const googleBtn = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (r: { credential: string }) => {
          try { await signInWithGoogle(r.credential); } catch (e) { toast.error((e as Error).message); }
        },
      });
      if (googleBtn.current) window.google?.accounts.id.renderButton(googleBtn.current, { theme: 'outline', size: 'large', width: 320, text: 'signin_with' });
    };
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [signInWithGoogle]);

  const dev = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try { await devSignIn(email.trim()); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="flex h-full items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-[380px]">
        <Link to="/" className="mb-8 inline-flex"><Logo subtitle="Sales CRM" /></Link>
        <div className="rounded-2xl border border-line bg-white p-7 shadow-card">
          <h1 className="text-[20px] font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Sign in with your Prosperr Google account.</p>

          <div className="mt-6 space-y-4">
            {GOOGLE_CLIENT_ID ? <div ref={googleBtn} className="flex justify-center" /> : (
              <p className="rounded-lg bg-canvas px-3 py-2.5 text-xs text-ink-muted">
                Google sign-in turns on once <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code> is set.
              </p>
            )}

            {DEV_LOGIN && (
              <>
                <div className="flex items-center gap-3 text-2xs uppercase tracking-wider text-ink-muted/70">
                  <span className="h-px flex-1 bg-line" />Local development<span className="h-px flex-1 bg-line" />
                </div>
                <form onSubmit={dev} className="space-y-3">
                  <Field label="Work email">
                    <Input type="email" autoFocus placeholder="you@prosperr.io" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                  <Button variant="primary" className="w-full justify-center" loading={busy} type="submit">
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
          <ShieldCheck className="h-3.5 w-3.5" /> Access is managed by your Prosperr admin.
        </p>
      </div>
    </div>
  );
}
