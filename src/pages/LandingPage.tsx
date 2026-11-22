import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { Hero, LandingNav } from '@/components/landing/Hero';
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
    return () => { document.title = prev; document.documentElement.style.scrollBehavior = ''; };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-auto bg-white text-[15px] leading-6 text-ink">
        <a href="#story" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
        <LandingNav />
        <main>
          <Hero />
          <ProblemSolution />
          <Showcase />
          <Workflow />
          <Roles />
          <VideoShowcase />
          <Features />
          <FinalCta />
        </main>
      </div>
    </MotionConfig>
  );
}
