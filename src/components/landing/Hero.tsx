import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, type MotionValue, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ArrowUp, ArrowUpRight, ChevronDown, Menu, Sparkle, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/brand/Logo';
import { MEDIA } from '@/lib/media/manifest';
import { ease } from '@/lib/animations';
import { Magnetic, WordReveal } from '@/lib/animations/components';
import { CinematicMedia } from './CinematicMedia';
import { TopoSurface } from '@/components/brand/TopoLines';
import { CallCard, DealCard, IcpCard } from './previews';

export const DEMO_URL = (import.meta.env.VITE_DEMO_URL as string | undefined) || '#cta';

const LINKS = [['Product', '#product'], ['Workflow', '#workflow'], ['Roles', '#roles'], ['Features', '#features']] as const;

/** Which section is on screen, for the nav's active pill. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [ids]);
  return active;
}

/** prosperr.io-style header: forest announcement strip + light bar with the PROSPERR.IO wordmark and a forest pill CTA. */
/** `base` is '' on the landing page and '/' elsewhere, so section links jump back to the landing page. */
export function LandingNav({ base = '' }: { base?: string }) {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [far, setFar] = useState(false);
  const active = useActiveSection(LINKS.map(([, h]) => h.slice(1)));
  useEffect(() => {
    const on = () => { setScrolled(window.scrollY > 24); setFar(window.scrollY > 900); };
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const cta = user ? 'Open CRM' : 'Log In / Sign Up';
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* announcement strip */}
      <div className={cn('overflow-hidden bg-brand-forest text-white transition-[height] duration-300', scrolled ? 'h-0' : 'h-10')}>
        <a href={`${base}#pillars`} className="group flex h-10 items-center justify-center gap-2.5 px-4 text-[13.5px] font-medium sm:text-[15px]">
          <Sparkle className="h-3.5 w-3.5 fill-white" />
          <span className="truncate"><span className="sm:hidden">One CRM for every sales seat</span><span className="hidden sm:inline">Built for Prosperr's B2B sales team: one CRM, every seat</span></span>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </div>

      <div className={cn('relative border-b transition-all duration-300',
        scrolled ? 'border-black/5 bg-[#F3F3F5]/85 shadow-[0_10px_30px_-18px_rgba(21,27,25,.35)] backdrop-blur-xl' : 'border-black/[0.06] bg-[#F3F3F5]')}>
        <nav className={cn('mx-auto flex max-w-[1440px] items-center gap-6 px-5 transition-[height] duration-300 lg:px-6', scrolled ? 'h-16' : 'h-[76px]')} aria-label="Main">
          <a href={`${base}#top`} aria-label="Prosperr home" className="flex items-center gap-3">
            <Logo size="sm" className="sm:hidden" /><Logo className="hidden sm:flex" />
            <span className="hidden rounded-full border border-ink/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft lg:inline">Sales CRM</span>
          </a>

          <div className="ml-auto hidden items-center gap-1 md:flex">
            {LINKS.map(([l, h]) => {
              const on = active === h.slice(1);
              return (
                <a key={h} href={`${base}${h}`} className={cn('relative rounded-full px-4 py-2 text-[15px] font-semibold transition-colors', on ? 'text-brand-forest' : 'text-ink hover:text-brand-forest')}>
                  {on && <motion.span layoutId="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="absolute inset-0 -z-0 rounded-full bg-white shadow-[0_1px_2px_rgba(21,27,25,.06),0_0_0_1px_rgba(6,63,26,.08)]" />}
                  <span className="relative">{l}</span>
                </a>
              );
            })}
          </div>

          <Magnetic strength={0.15} className="ml-auto md:ml-4">
            <Link to={user ? '/' : '/login'}
              className="group relative inline-flex h-11 items-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-brand-forest px-4 text-[14px] sm:px-5 sm:text-[15px] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(6,63,26,.8)] transition-colors hover:bg-brand-forest-700">
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative"><span className="sm:hidden">{user ? 'Open CRM' : 'Log In'}</span><span className="hidden sm:inline">{cta}</span></span>
              <ArrowUpRight className="relative h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </Magnetic>
          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink ring-1 ring-black/5 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* reading progress */}
        <motion.div aria-hidden style={{ scaleX: progress }} className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-brand-forest via-brand-mint to-brand-mint" />
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: ease.out }} className="overflow-hidden border-t border-black/5 md:hidden">
              <div className="space-y-1 px-5 py-4">
                {LINKS.map(([l, h]) => (
                  <a key={h} href={`${base}${h}`} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-[16px] font-semibold">
                    {l}<ArrowUpRight className="h-4 w-4 text-ink-muted" />
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* back to top */}
      <AnimatePresence>
        {far && !base && (
          <motion.a href="#top" aria-label="Back to top" initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.9 }}
            className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#141614]/90 text-paper shadow-[0_16px_40px_-12px_rgba(0,0,0,.6)] backdrop-blur transition-colors hover:bg-brand-forest">
            <ArrowUp className="h-5 w-5" />
          </motion.a>
        )}
      </AnimatePresence>
    </header>
  );
}

export function GlowButton({ to, href, children, variant = 'primary' }: { to?: string; href?: string; children: React.ReactNode; variant?: 'primary' | 'forest' | 'ghost' }) {
  const cls = cn('group relative inline-flex h-14 items-center gap-2 overflow-hidden rounded-full px-7 text-[17px] font-semibold transition-all duration-300 focus-visible:ring-4 focus-visible:ring-paper/40',
    variant === 'primary' && 'bg-white text-brand-forest hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,.5)]',
    variant === 'forest' && 'bg-brand-forest text-white ring-[1.5px] ring-paper/80 hover:bg-brand-forest-700 hover:shadow-glow',
    variant === 'ghost' && 'border-[1.5px] border-paper/70 bg-black/25 text-paper backdrop-blur hover:border-paper hover:bg-white/10');
  const inner = (
    <>
      {variant !== 'ghost' && <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(60%_120%_at_50%_0%,rgba(255,255,255,.45),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
      <span className="relative flex items-center gap-2">{children}</span>
    </>
  );
  return (
    <Magnetic>
      {to ? <Link to={to} className={cls}>{inner}</Link> : <a href={href} className={cls}>{inner}</a>}
    </Magnetic>
  );
}

function useLayer(sx: MotionValue<number>, sy: MotionValue<number>, depth: number) {
  return { x: useTransform(sx, (v) => v * depth), y: useTransform(sy, (v) => v * depth) };
}

export function Hero() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '18%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-12%']);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // pointer parallax for floating cards (existing layers) + a whole-scene 3D tilt on top
  const px = useMotionValue(0), py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 20 }), sy = useSpring(py, { stiffness: 60, damping: 20 });
  const l1 = useLayer(sx, sy, 18), l2 = useLayer(sx, sy, -26), l3 = useLayer(sx, sy, 34);
  const sceneRY = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const sceneRX = useTransform(sy, [-0.5, 0.5], [10, -10]);
  const spotX = useTransform(sx, (v) => `${50 + v * 60}%`), spotY = useTransform(sy, (v) => `${40 + v * 60}%`);
  const spot = useTransform([spotX, spotY], ([x, y]) => `radial-gradient(600px circle at ${x} ${y}, rgba(239,239,239,.07), transparent 60%)`);

  return (
    <section id="top" ref={ref} className="relative isolate flex min-h-[720px] items-end overflow-hidden bg-brand-night text-paper h-[100svh]"
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== 'mouse') return;
        px.set(e.clientX / window.innerWidth - 0.5); py.set(e.clientY / window.innerHeight - 0.5);
      }}>
      <motion.div className="absolute inset-0 -z-10" style={{ y: bgY }}
        initial={{ opacity: 0, scale: reduce ? 1 : 1.12 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2.2, ease: ease.out }}>
        {MEDIA.hero.sources.desktop || MEDIA.hero.poster ? <CinematicMedia clip={MEDIA.hero} priority className="h-full w-full" /> : <TopoSurface />}
      </motion.div>
      {/* readability overlay: dark at the bottom-left where the headline sits, like prosperr.io */}
      {/* same grade as the closing CTA box: a soft green glow, no dark overlays */}
      <div className="absolute left-[38%] top-1/2 -z-10 h-[520px] w-[980px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-mint/[0.12] blur-[120px]" />
      {/* pointer-following light */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden lg:block"
        style={{ background: spot }} />

      <motion.div style={{ y: contentY, opacity: fade }} className="mx-auto grid w-full max-w-7xl items-end gap-10 px-5 pb-24 pt-40 lg:grid-cols-[1.2fr_1fr] lg:px-8 lg:pb-28">
        <div>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: ease.out }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-paper/25 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-paper/90 backdrop-blur">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-mint opacity-60" /><span className="relative h-2 w-2 rounded-full bg-brand-mint" /></span>Sales CRM · B2B team
          </motion.p>
          <WordReveal immediate text="Turn every lead into an opportunity." delay={0.45}
            className="max-w-[15ch] font-display text-[46px] font-medium leading-[0.98] tracking-[-0.045em] text-paper sm:text-[64px] lg:text-[84px]" />
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.9, ease: ease.out }}
            className="mt-5 max-w-[46ch] text-[18px] font-medium leading-relaxed text-paper/75 sm:text-[22px]">
            Your B2B team's command centre for prospecting, pipeline &amp; performance.
          </motion.p>
          <motion.div className="mt-9 flex flex-wrap gap-4" initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 1.4 } } }}>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: ease.out } } }}>
              <GlowButton href={DEMO_URL} variant="forest">Book A Demo Call <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></GlowButton>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: ease.out } } }}>
              <GlowButton to={user ? '/' : '/login'} variant="ghost">Explore the CRM <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></GlowButton>
            </motion.div>
          </motion.div>
        </div>

        {/* floating product cards, now inside a 3D scene that tilts with the pointer */}
        <div className="relative hidden h-[520px] self-center [perspective:1400px] lg:block" aria-hidden>
          <motion.div className="preserve-3d absolute inset-0" style={reduce ? undefined : { rotateX: sceneRX, rotateY: sceneRY }}>
            <motion.div className="absolute left-0 top-0" style={{ ...l1, translateZ: 60 }} initial={{ opacity: 0, y: 40, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: -3 }} transition={{ delay: 1.5, duration: 1.1, ease: ease.out }}>
              <div className="motion-safe:animate-[float-y_7s_ease-in-out_infinite]"><IcpCard /></div>
            </motion.div>
            <motion.div className="absolute right-0 top-[130px]" style={{ ...l2, translateZ: 110 }} initial={{ opacity: 0, y: 40, rotate: 5 }} animate={{ opacity: 1, y: 0, rotate: 3 }} transition={{ delay: 1.7, duration: 1.1, ease: ease.out }}>
              <div className="motion-safe:animate-[float-y_8s_ease-in-out_1s_infinite]"><DealCard /></div>
            </motion.div>
            <motion.div className="absolute bottom-0 left-6" style={{ ...l3, translateZ: 160 }} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.9, duration: 1.1, ease: ease.out }}>
              <div className="motion-safe:animate-[float-y_9s_ease-in-out_2s_infinite]"><CallCard /></div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      <motion.a href="#pillars" aria-label="Scroll to learn more" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/50 hover:text-white/80">
        Scroll<ChevronDown className="h-4 w-4 animate-scroll-cue" />
      </motion.a>
    </section>
  );
}
