import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/brand/Logo';
import { WordReveal, Reveal } from '@/lib/animations/components';
import { DEMO_URL, GlowButton } from './Hero';

export function FinalCta() {
  const { user } = useAuth();
  return (
    <section id="cta" className="relative isolate overflow-hidden bg-brand-forest text-white">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#042A12,#063F1A,#0A5124,#0F3A33,#063F1A)] bg-[length:300%_300%] motion-safe:animate-gradient-pan" />
      <div className="absolute left-1/2 top-0 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-brand-lime/15 blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} className="absolute bottom-0 h-1 w-1 rounded-full bg-brand-lime-300 motion-safe:animate-[rise_12s_linear_infinite]"
            style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.55) % 12}s`, opacity: 0 }} />
        ))}
      </div>

      <div className="mx-auto max-w-5xl px-5 py-28 text-center lg:py-40">
        <WordReveal as="h2" text="Build a Smarter Sales Engine." className="text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[64px] lg:text-[84px]" />
        <Reveal delay={0.4}>
          <p className="mx-auto mt-6 max-w-[48ch] text-[17px] text-white/70">Give every BDR a queue, every AE a clear next step, and every leader a pipeline they can trust.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <GlowButton to={user ? '/' : '/login'}>
              {user ? 'Open Prosperr CRM' : 'Sign in to Prosperr CRM'}
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} className="motion-reduce:!transform-none"><ArrowRight className="h-4 w-4" /></motion.span>
            </GlowButton>
            {DEMO_URL !== '#cta' && <GlowButton href={DEMO_URL} variant="ghost">Book a Demo</GlowButton>}
          </div>
        </Reveal>
      </div>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-[13px] text-white/55 sm:flex-row lg:px-8">
          <Logo tone="light" subtitle="Sales CRM" />
          <nav className="flex gap-6" aria-label="Footer">
            <a href="#product" className="hover:text-white">Product</a><a href="#workflow" className="hover:text-white">Workflow</a>
            <a href="#roles" className="hover:text-white">Roles</a><a href="#features" className="hover:text-white">Features</a>
          </nav>
          <p>© {new Date().getFullYear()} Prosperr</p>
        </div>
      </footer>
    </section>
  );
}
