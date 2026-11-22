import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { cn } from '@/lib/cn';
import { ease, fadeUp, revealViewport, stagger } from './index';

/** Headline that appears word by word. Screen readers get the plain sentence. */
/** `immediate` plays on mount instead of on scroll-into-view: use it for above-the-fold headlines. */
export function WordReveal({ text, className, delay = 0, as: Tag = 'h1', immediate = false, accentFrom, accentClass = 'dim-dark' }: { text: string; className?: string; delay?: number; as?: 'h1' | 'h2' | 'p'; immediate?: boolean; accentFrom?: number; accentClass?: string }) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  const M = motion[Tag];
  return (
    <M className={className} aria-label={text} initial="hidden" {...(immediate ? { animate: 'show' } : { whileInView: 'show', viewport: { once: true } })} variants={stagger(0.07, delay)}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span className={cn('inline-block', accentFrom !== undefined && i >= accentFrom && accentClass)}
            variants={reduce ? { hidden: { opacity: 0 }, show: { opacity: 1 } } : {
              hidden: { y: '105%', opacity: 0 },
              show: { y: '0%', opacity: 1, transition: { duration: 0.9, ease: ease.out } },
            }}>
            {w}{i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </M>
  );
}

/** Generic scroll reveal wrapper. */
export function Reveal({ children, className, delay = 0, y = 24 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={{ opacity: 0, y: reduce ? 0 : y, filter: reduce ? 'none' : 'blur(8px)' }} whileInView={{ opacity: 1, y: 0, filter: reduce ? 'none' : 'blur(0px)' }}
      viewport={revealViewport} transition={{ duration: 0.9, ease: ease.out, delay }}>
      {children}
    </motion.div>
  );
}

export function StaggerGroup({ children, className, gap = 0.08 }: { children: ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={revealViewport} variants={stagger(gap)}>
      {children}
    </motion.div>
  );
}

export const StaggerItem = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div className={className} variants={fadeUp}>{children}</motion.div>
);

/** Counts up once when scrolled into view. */
export function CountUp({ to, prefix = '', suffix = '', decimals = Number.isInteger(to) ? 0 : 1, className }: { to: number; prefix?: string; suffix?: string; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView || reduce) { if (reduce) setV(to); return; }
    const c = animate(0, to, { duration: 1.6, ease: ease.out, onUpdate: setV });
    return () => c.stop();
  }, [inView, to, reduce]);
  return <span ref={ref} className={cn('tabular-nums', className)}>{prefix}{v.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}</span>;
}

/** Element that leans toward the pointer. Disabled for touch and reduced motion. */
export function Magnetic({ children, strength = 0.25, className }: { children: ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 }), sy = useSpring(y, { stiffness: 220, damping: 18 });
  return (
    <motion.div className={cn('inline-block', className)} style={reduce ? undefined : { x: sx, y: sy }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.div>
  );
}
