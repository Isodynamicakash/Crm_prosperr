import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, type MotionValue, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ChevronDown, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/brand/Logo';
import { MEDIA } from '@/lib/media/manifest';
import { ease } from '@/lib/animations';
import { Magnetic, WordReveal } from '@/lib/animations/components';
import { CinematicMedia } from './CinematicMedia';
import { CallCard, DealCard, IcpCard } from './previews';

export const DEMO_URL = (import.meta.env.VITE_DEMO_URL as string | undefined) || '#cta';

export function LandingNav() {
  const { user } = useAuth();
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-300',
      solid ? 'border-b border-black/5 bg-white/90 backdrop-blur-xl' : 'bg-transparent')}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-5 lg:px-8" aria-label="Main">
        <a href="#top" aria-label="Prosperr home"><Logo tone={solid ? 'forest' : 'light'} subtitle="Sales CRM" /></a>
        <div className={cn('hidden gap-6 text-[13.5px] font-medium md:flex', solid ? 'text-ink-soft' : 'text-white/75')}>
          {[['Product', '#product'], ['Workflow', '#workflow'], ['Roles', '#roles'], ['Features', '#features']].map(([l, h]) => (
            <a key={h} href={h} className={cn('transition-colors', solid ? 'hover:text-ink' : 'hover:text-white')}>{l}</a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link to={user ? '/' : '/login'} className={cn('rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
            solid ? 'bg-brand-forest text-white hover:bg-brand-forest-700' : 'bg-white text-brand-forest hover:bg-brand-lime-50')}>
            {user ? 'Open CRM' : 'Sign in'}
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function GlowButton({ to, href, children, variant = 'primary' }: { to?: string; href?: string; children: React.ReactNode; variant?: 'primary' | 'ghost' }) {
  const cls = cn('group relative inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-all duration-300 focus-visible:ring-4 focus-visible:ring-brand-lime/40',
    variant === 'primary'
      ? 'bg-brand-lime text-brand-charcoal hover:shadow-glow'
      : 'border border-white/25 bg-white/5 text-white backdrop-blur hover:border-white/50 hover:bg-white/10');
  const inner = (
    <>
      {variant === 'primary' && <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(60%_120%_at_50%_0%,rgba(255,255,255,.55),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
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

  // pointer parallax for floating cards
  const px = useMotionValue(0), py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 20 }), sy = useSpring(py, { stiffness: 60, damping: 20 });
  const l1 = useLayer(sx, sy, 18), l2 = useLayer(sx, sy, -26), l3 = useLayer(sx, sy, 34);

  return (
    <section id="top" ref={ref} className="relative isolate flex min-h-[680px] items-center overflow-hidden bg-brand-charcoal text-white h-[100svh]"
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== 'mouse') return;
        px.set(e.clientX / window.innerWidth - 0.5); py.set(e.clientY / window.innerHeight - 0.5);
      }}>
      <motion.div className="absolute inset-0 -z-10" style={{ y: bgY }}
        initial={{ opacity: 0, scale: reduce ? 1 : 1.12 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2.2, ease: ease.out }}>
        <CinematicMedia clip={MEDIA.hero} priority className="h-full w-full" />
      </motion.div>
      {/* readability overlay */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(21,27,25,.92)_0%,rgba(6,63,26,.72)_45%,rgba(21,27,25,.25)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-brand-charcoal to-transparent" />

      <motion.div style={{ y: contentY, opacity: fade }} className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pt-16 lg:grid-cols-[1.15fr_1fr] lg:px-8">
        <div>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: ease.out }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-medium text-brand-lime-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-lime" />Prosperr Sales CRM
          </motion.p>
          <WordReveal text="Turn Every Lead Into an Opportunity." delay={0.45}
            className="max-w-[14ch] text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[60px] lg:text-[76px]" />
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.9, ease: ease.out }}
            className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-white/70 sm:text-[19px]">
            One intelligent platform to manage prospecting, sales operations, team performance and business growth.
          </motion.p>
          <motion.div className="mt-9 flex flex-wrap gap-3" initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 1.4 } } }}>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: ease.out } } }}>
              <GlowButton to={user ? '/' : '/login'}>Explore Prosperr CRM <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></GlowButton>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: ease.out } } }}>
              <GlowButton href={DEMO_URL} variant="ghost"><PlayCircle className="h-4 w-4" />Book a Demo</GlowButton>
            </motion.div>
          </motion.div>
        </div>

        {/* floating product cards */}
        <div className="relative hidden h-[460px] lg:block" aria-hidden>
          <motion.div className="absolute left-4 top-6" style={l1} initial={{ opacity: 0, y: 40, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: -3 }} transition={{ delay: 1.5, duration: 1.1, ease: ease.out }}>
            <div className="motion-safe:animate-[float-y_7s_ease-in-out_infinite]"><IcpCard /></div>
          </motion.div>
          <motion.div className="absolute right-0 top-28" style={l2} initial={{ opacity: 0, y: 40, rotate: 5 }} animate={{ opacity: 1, y: 0, rotate: 3 }} transition={{ delay: 1.7, duration: 1.1, ease: ease.out }}>
            <div className="motion-safe:animate-[float-y_8s_ease-in-out_1s_infinite]"><DealCard /></div>
          </motion.div>
          <motion.div className="absolute bottom-6 left-24" style={l3} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.9, duration: 1.1, ease: ease.out }}>
            <div className="motion-safe:animate-[float-y_9s_ease-in-out_2s_infinite]"><CallCard /></div>
          </motion.div>
        </div>
      </motion.div>

      <motion.a href="#story" aria-label="Scroll to learn more" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}
        className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/50 hover:text-white/80">
        Scroll<ChevronDown className="h-4 w-4 animate-scroll-cue" />
      </motion.a>
    </section>
  );
}
