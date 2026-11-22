import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { ease } from '@/lib/animations';
import { Reveal } from '@/lib/animations/components';
import { MEDIA, type MediaClip } from '@/lib/media/manifest';
import { CinematicMedia } from './CinematicMedia';

function Tile({ clip, className, i, show }: { clip: MediaClip; className?: string; i: number; show: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.figure className={cn('group relative overflow-hidden rounded-3xl', className)}
      initial={{ clipPath: reduce ? 'inset(0% 0% 0% 0% round 24px)' : 'inset(100% 0% 0% 0% round 24px)' }}
      animate={show ? { clipPath: 'inset(0% 0% 0% 0% round 24px)' } : undefined}
      transition={{ duration: 1.2, delay: i * 0.12, ease: ease.inOut }}>
      <motion.div className="h-full w-full" initial={{ scale: reduce ? 1 : 1.2 }} animate={show ? { scale: 1 } : undefined} transition={{ duration: 1.6, delay: i * 0.12, ease: ease.out }}>
        <CinematicMedia clip={clip} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/80 via-transparent to-transparent" />
      <figcaption className="absolute bottom-5 left-5 text-[15px] font-semibold text-white">{clip.caption}</figcaption>
    </motion.figure>
  );
}

export function VideoShowcase() {
  const grid = useRef<HTMLDivElement>(null);
  const show = useInView(grid, { once: true, amount: 0.15 });
  return (
    <section className="bg-brand-charcoal py-24 text-white lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand-lime">In the field</p>
          <h2 className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[48px]">Research, meetings and decisions, all feeding one system.</h2>
        </Reveal>
        <div ref={grid} className="mt-12 grid auto-rows-[220px] gap-4 sm:auto-rows-[260px] md:grid-cols-6">
          <Tile i={0} show={show} clip={MEDIA.research} className="md:col-span-2 md:row-span-2" />
          <Tile i={1} show={show} clip={MEDIA.data} className="md:col-span-4" />
          <Tile i={2} show={show} clip={MEDIA.meeting} className="md:col-span-2" />
          <Tile i={3} show={show} clip={MEDIA.growth} className="md:col-span-2" />
        </div>
      </div>
    </section>
  );
}
