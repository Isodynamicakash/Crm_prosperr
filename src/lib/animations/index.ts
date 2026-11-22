import type { Transition, Variants } from 'motion/react';

/**
 * Two motion personalities (see docs/DESIGN.md):
 *  - landing: expressive, longer, scroll-driven
 *  - app: restrained, short, purely feedback
 */
export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

export const duration = { app: 0.18, landing: 0.8, landingSlow: 1.2 };

export const landingTransition: Transition = { duration: duration.landing, ease: ease.out };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: ease.out } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: landingTransition },
};

export const stagger = (gap = 0.08, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

/** Viewport settings for scroll reveals: play once, a little before the element is fully in view. */
export const revealViewport = { once: true, margin: '0px 0px -12% 0px' } as const;
