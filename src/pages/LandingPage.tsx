import { useEffect } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { Hero, LandingNav } from '@/components/landing/Hero';
import { Pillars } from '@/components/landing/Pillars';
import { ProblemSolution } from '@/components/landing/ProblemSolution';
import { Showcase } from '@/components/landing/Showcase';
import { Workflow } from '@/components/landing/Workflow';
import { Roles } from '@/components/landing/Roles';
import { VideoShowcase } from '@/components/landing/VideoShowcase';
import { Features } from '@/components/landing/Features';
import { FinalCta } from '@/components/landing/FinalCta';

/**
 * Public marketing page. Lazy-loaded, so Motion/GSAP landing code never ships with the CRM screens.
 * MotionConfig "user" makes every Motion animation honour prefers-reduced-motion.
 */
export default function LandingPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Prosperr CRM · Turn every lead into an opportunity';
    document.documentElement.style.scrollBehavior = 'smooth';
    // arriving from another page with /#section: wait for the lazy sections, then jump there
    const t = window.location.hash ? window.setTimeout(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView(), 350) : undefined;
    return () => { window.clearTimeout(t); document.title = prev; document.documentElement.style.scrollBehavior = ''; };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="relative h-auto bg-canvas text-[15px] leading-6 text-ink [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display">
        <a href="#pillars" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
        {/* prosperr.io frame: hairlines at the content edges, visible on light sections, vanishing on dark ones */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[5] hidden mix-blend-multiply xl:block">
          <div className="mx-auto h-full max-w-[1340px] border-x border-line" />
        </div>
        <LandingNav />
        <main>
          <Hero />
          <Pillars />
          <ProblemSolution />
          <Showcase />
          <Workflow />
          <Roles />
          <VideoShowcase />
          <Features />
          <FinalCta />
        </main>
      </motion.div>
    </MotionConfig>
  );
}
