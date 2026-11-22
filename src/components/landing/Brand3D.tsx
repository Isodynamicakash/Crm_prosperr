import { useRef, type ReactNode } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { cn } from '@/lib/cn';

/** Card that tilts toward the pointer in 3D with a moving glare. Children can lift with translateZ. */
export function TiltCard({ children, className, max = 10, glare = true }: { children: ReactNode; className?: string; max?: number; glare?: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5), y = useMotionValue(0.5);
  const sx = useSpring(x, { stiffness: 180, damping: 18 }), sy = useSpring(y, { stiffness: 180, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const gx = useTransform(sx, (v) => `${v * 100}%`), gy = useTransform(sy, (v) => `${v * 100}%`);
  const bg = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, rgba(255,255,255,.55), transparent 45%)`;
  return (
    <div className="h-full [perspective:1200px]">
      <motion.div ref={ref} className={cn('group/tilt preserve-3d relative', className)} style={reduce ? undefined : { rotateX, rotateY }}
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== 'mouse' || !ref.current) return;
          const r = ref.current.getBoundingClientRect();
          x.set((e.clientX - r.left) / r.width); y.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => { x.set(0.5); y.set(0.5); }}>
        {children}
        {glare && !reduce && <motion.span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover/tilt:opacity-100" style={{ background: bg }} />}
      </motion.div>
    </div>
  );
}
