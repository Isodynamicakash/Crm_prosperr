import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/brand/Logo';
import { WordReveal, Reveal } from '@/lib/animations/components';
import { DEMO_URL, GlowButton } from './Hero';
import { TopoSurface } from '@/components/brand/TopoLines';

/** Closing call to action: a rounded box on the light canvas with the contour surface inside it, then the black footer. */
export function FinalCta() {
  const { user } = useAuth();
  return (
    <>
      <section id="cta" className="bg-canvas px-5 pb-16 lg:px-8 lg:pb-20">
        <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-[40px] px-6 py-20 text-center text-paper sm:px-12 lg:py-28">
          <TopoSurface pattern="a" className="-z-20" />
          <div className="absolute left-1/2 top-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-mint/[0.12] blur-[120px]" />
          {/* slow light sweep */}
          <div className="absolute inset-y-0 -left-1/3 -z-10 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent motion-safe:animate-[sweep_9s_ease-in-out_infinite]" />
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} className="absolute bottom-0 h-1 w-1 rounded-full bg-brand-mint/60 motion-safe:animate-[rise_12s_linear_infinite]"
                style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.65) % 12}s`, opacity: 0 }} />
            ))}
          </div>

          <p className="eyebrow-dark">Ready when your team is</p>
          <WordReveal as="h2" text="Build a smarter sales engine." accentFrom={3} className="mx-auto mt-6 max-w-[16ch] text-[44px] font-medium leading-[1] tracking-[-0.05em] sm:text-[64px] lg:text-[88px]" />
          <Reveal delay={0.4}>
            <p className="mx-auto mt-6 max-w-[48ch] text-[18px] text-paper/70">Give every BDR a queue, every AE a clear next step, and every leader a pipeline they can trust.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <GlowButton to={user ? '/' : '/login'} variant="forest">
                {user ? 'Open Prosperr CRM' : 'Sign in to Prosperr CRM'}
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} className="motion-reduce:!transform-none"><ArrowRight className="h-4 w-4" /></motion.span>
              </GlowButton>
              <GlowButton href={DEMO_URL} variant="ghost">Book a Demo Call</GlowButton>
            </div>
          </Reveal>
        </div>
      </section>
      <Footer />
    </>
  );
}

const COLS: [string, [string, string][]][] = [
  ['Product', [['Dashboard', '#product'], ['Lead management', '#product'], ['Pipeline', '#product'], ['Reports', '#product']]],
  ['Workflow', [['Contact mining', '#workflow'], ['SQL qualification', '#workflow'], ['Sales meetings', '#workflow'], ['Closed Won', '#workflow']]],
  ['Roles', [['BDR', '#roles'], ['Account Executive', '#roles'], ['Sales Manager', '#roles'], ['Leadership', '#roles']]],
  ['Platform', [['Features', '#features'], ['Role-based access', '#features'], ['Activity tracking', '#features'], ['Book a demo', DEMO_URL]]],
  ['Prosperr', [['prosperr.io', 'https://www.prosperr.io/'], ['Prosperr Benefits', 'https://www.prosperr.io/'], ['Super Saver', 'https://www.prosperr.io/']]],
];

export function Footer({ base = '' }: { base?: string }) {
  const { user } = useAuth();
  return (
    <footer className="bg-brand-night text-paper">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-16 lg:px-8 lg:pt-20">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <h2 className="max-w-[16ch] font-display text-[40px] font-medium leading-[1.02] tracking-[-0.045em] sm:text-[56px]">
              Your pipeline deserves the <span className="dim-dark">highest standards.</span>
            </h2>
          </Reveal>
          <Link to={user ? '/' : '/login'} className="group inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-full bg-paper px-6 text-[15px] font-semibold text-ink transition-transform hover:-translate-y-0.5 lg:self-auto">
            {user ? 'Open CRM' : 'Log In / Sign Up'} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <nav className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5" aria-label="Footer">
          {COLS.map(([head, links]) => (
            <div key={head}>
              <p className="text-[16px] font-semibold text-paper">{head}</p>
              <ul className="mt-5 space-y-3">
                {links.map(([l, h]) => (
                  <li key={l}>
                    <a href={h.startsWith('#') ? `${base}${h}` : h} {...(h.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                      className="group relative inline-block text-[15px] text-paper/55 transition-colors hover:text-paper">
                      {l}
                      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-paper/60 transition-transform duration-300 group-hover:scale-x-100" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-14 flex flex-col gap-6 border-t border-paper/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo tone="light" subtitle="Sales CRM" size="sm" />
          <p className="text-[13px] text-paper/45">© {new Date().getFullYear()} Prosperr · Internal sales platform</p>
        </div>
      </div>
    </footer>
  );
}
