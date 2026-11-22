import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Check, Loader2, Mail, ShieldCheck, Sparkle } from 'lucide-react';
import { ease } from '@/lib/animations';
import { useAuth } from '@/lib/auth';
import { LoginScene } from '@/components/landing/LoginScene';
import { LandingNav } from '@/components/landing/Hero';
import { Footer } from '@/components/landing/FinalCta';
import { TopoSurface } from '@/components/brand/TopoLines';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Working late';
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

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

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const item = { hidden: { opacity: 0, y: 14, filter: 'blur(6px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: ease.out } } };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      className="relative isolate flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#141614] text-[15px] leading-6 [&_h1]:font-display [&_h2]:font-display">
      <TopoSurface className="fixed -z-20" />
      <div aria-hidden className="pointer-events-none fixed right-[8%] top-1/2 -z-10 h-[520px] w-[620px] -translate-y-1/2 rounded-full bg-brand-mint/[0.10] blur-[130px]" />

      <LandingNav base="/" />

      <main className="relative flex-1 pt-[104px] sm:pt-[116px]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-6 sm:px-6 sm:py-10 lg:min-h-[calc(100dvh-116px)] lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-16 lg:px-8 lg:py-14">
          <LoginScene />

          <motion.div initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, ease: ease.out, delay: 0.1 }}
            className="order-first w-full max-w-[480px] justify-self-center lg:order-none lg:justify-self-end">
            <div className="relative rounded-[28px] bg-white p-6 shadow-[0_40px_100px_-30px_rgba(0,0,0,.75)] sm:rounded-[36px] sm:p-10">
              <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } } }}>
                <motion.p variants={item} className="inline-flex items-center gap-1.5 rounded-full bg-brand-forest-50 px-3 py-1 text-[12.5px] font-medium text-brand-forest">
                  <Sparkle className="h-3 w-3 fill-brand-forest" />{greeting()}
                </motion.p>
                <motion.h1 variants={item} className="mt-4 font-display text-[34px] font-medium leading-[1.04] tracking-[-0.035em] sm:mt-5 sm:text-[46px]">
                  Welcome to<br /><span className="dim font-semibold">Prosperr CRM.</span>
                </motion.h1>
                <motion.p variants={item} className="mt-3 text-[15px] leading-relaxed text-ink-soft sm:mt-4">Sign in with your Prosperr work account. First time here? Use the e-mail your manager added you with.</motion.p>

                <motion.div variants={item} className="mt-6 sm:mt-7">
                  {GOOGLE_CLIENT_ID ? <div ref={googleBtn} className="flex justify-center" /> : (
                    <>
                      <button type="button" disabled title="Google sign-in is not configured in this environment"
                        className="flex h-14 w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-line bg-white text-[15.5px] font-semibold text-ink/60">
                        <GoogleG />Continue with Google
                      </button>
                      <p className="mt-2 text-center text-[12px] text-ink-muted">Turns on once Google sign-in is configured.</p>
                    </>
                  )}
                </motion.div>

                {DEV_LOGIN && (
                  <>
                    <motion.div variants={item} className="my-5 flex items-center gap-3 text-[12.5px] text-ink-muted">
                      <span className="h-px flex-1 bg-line" />or with e-mail<span className="h-px flex-1 bg-line" />
                    </motion.div>
                    <motion.form variants={item} onSubmit={dev} className="space-y-4" noValidate>
                      <label className="block">
                        <span className="mb-2 block text-[15px] font-medium text-ink">Work e-mail</span>
                        <span className="relative block">
                          <Mail className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-muted" />
                          <input type="email" inputMode="email" autoComplete="email" autoFocus placeholder="name@prosperr.io" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="h-14 w-full rounded-full border border-line bg-[#F7F7F8] pl-12 pr-12 text-[16px] text-ink outline-none transition-all duration-200 placeholder:text-ink-muted/70 focus:border-brand-forest/50 focus:bg-white focus:ring-4 focus:ring-brand-forest/10" />
                          <AnimatePresence>
                            {valid && (
                              <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-brand-mint text-white">
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                      </label>
                      <button type="submit" disabled={busy || !valid}
                        className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-brand-forest text-[16px] font-semibold text-white transition-all duration-300 hover:bg-brand-forest-700 hover:shadow-glow active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none">
                        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full group-disabled:hidden" />
                        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Sign in <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></>}
                      </button>
                    </motion.form>
                  </>
                )}
                <motion.p variants={item} className="mt-6 flex items-center justify-center gap-1.5 text-[12.5px] text-ink-muted">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-forest" /> Access is managed by your Prosperr admin.
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>
      <div className="mt-10 border-t border-white/[0.06]"><Footer base="/" /></div>
    </motion.div>
  );
}
