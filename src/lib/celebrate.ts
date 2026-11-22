/**
 * Small, brand-coloured confetti for meaningful milestones only (all tasks cleared, deal won).
 * Loaded on demand so it costs nothing until used. Skipped for users who prefer reduced motion.
 */
export async function celebrate(origin?: { x: number; y: number }) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { default: confetti } = await import('canvas-confetti');
  confetti({
    particleCount: 70, spread: 70, startVelocity: 32, gravity: 1.1, scalar: 0.8, ticks: 160,
    origin: origin ?? { x: 0.5, y: 0.35 },
    colors: ['#063F1A', '#8BC34A', '#22366F', '#B5DB88'],
    disableForReducedMotion: true,
  });
}
