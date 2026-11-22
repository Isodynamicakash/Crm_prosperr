import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import type { MediaClip } from '@/lib/media/manifest';

/**
 * Plays a clip from the media manifest, or draws a branded fallback scene while the clip doesn't exist.
 * - Muted, looping, playsInline, never any audio.
 * - Lazy: the file is only requested near the viewport (hero is the exception: `priority`).
 * - Pauses off-screen so only visible clips play / download.
 * - Reduced motion: poster or static fallback, no playback.
 */
export function CinematicMedia({ clip, className, priority = false }: { clip: MediaClip; className?: string; priority?: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(priority);
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  const src = (mobile ? clip.sources.mobile : null) ?? clip.sources.desktop;
  const playable = !!src && !reduce;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!playable || !el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setNear(true); el.play().catch(() => {}); } else { el.pause(); }
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [playable]);

  return (
    <div className={cn('relative overflow-hidden bg-brand-charcoal', className)}>
      {playable ? (
        <video ref={ref} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline autoPlay={priority}
          preload={priority ? 'auto' : 'none'} poster={clip.poster ?? undefined} aria-hidden>
          {near && src.webm && <source src={src.webm} type="video/webm" />}
          {near && <source src={src.mp4} type="video/mp4" />}
        </video>
      ) : clip.poster ? (
        <img src={clip.poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading={priority ? 'eager' : 'lazy'} />
      ) : (
        <FallbackScene kind={clip.fallback} still={!!reduce} />
      )}
    </div>
  );
}

/** Abstract, text-free scenes in brand colours. No fake people, logos or interfaces. */
function FallbackScene({ kind, still }: { kind: MediaClip['fallback']; still: boolean }) {
  const drift = still ? '' : 'motion-safe:animate-[drift_22s_ease-in-out_infinite_alternate]';
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_10%,#0A5124_0%,#063F1A_38%,#151B19_100%)]" />
      {kind === 'office' && (
        <>
          {/* glass facade */}
          <div className={cn('absolute -inset-[10%] opacity-[0.22] [background:repeating-linear-gradient(90deg,transparent_0_86px,rgba(255,255,255,.35)_86px_87px,transparent_87px_172px),repeating-linear-gradient(0deg,transparent_0_120px,rgba(255,255,255,.18)_120px_121px)] [transform:perspective(900px)_rotateY(-18deg)_scale(1.2)]', drift)} />
          <div className="absolute -right-[10%] top-[-20%] h-[90%] w-[60%] rounded-full bg-[#B5DB88]/25 blur-[110px]" />
          <div className="absolute bottom-[-30%] left-[-10%] h-[70%] w-[55%] rounded-full bg-brand-navy/50 blur-[120px]" />
        </>
      )}
      {kind === 'research' && (
        <>
          <div className="absolute left-1/2 top-1/2 h-[46%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/10 shadow-[0_0_120px_40px_rgba(139,195,74,.18)] ring-1 ring-white/15" />
          <div className="absolute left-1/2 top-1/2 h-[46%] w-[62%] -translate-x-1/2 -translate-y-1/2 space-y-[6%] p-[5%]">
            {[70, 52, 84, 40].map((w, i) => <div key={i} className="h-[9%] rounded bg-white/15" style={{ width: `${w}%` }} />)}
          </div>
          <div className={cn('absolute -left-[20%] top-[10%] h-[80%] w-[60%] rounded-full bg-brand-lime/15 blur-[100px]', drift)} />
        </>
      )}
      {kind === 'meeting' && (
        <>
          <div className="absolute inset-x-[10%] bottom-[18%] h-[10%] rounded-[50%] bg-white/10 blur-md" />
          {[18, 40, 62, 80].map((l, i) => (
            <div key={l} className="absolute bottom-[26%] h-[34%] w-[13%] rounded-t-full bg-gradient-to-b from-white/18 to-transparent" style={{ left: `${l}%`, opacity: 0.5 + (i % 2) * 0.2 }} />
          ))}
          <div className={cn('absolute right-[-10%] top-[-10%] h-[70%] w-[60%] rounded-full bg-[#E5A13B]/15 blur-[110px]', drift)} />
        </>
      )}
      {kind === 'data' && (
        <>
          <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(181,219,136,.55)_1px,transparent_1.5px)] [background-size:22px_22px] [mask-image:radial-gradient(70%_70%_at_50%_50%,#000,transparent)]" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 225" preserveAspectRatio="none">
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M0 ${150 - i * 30} C 100 ${60 + i * 20}, 200 ${200 - i * 25}, 400 ${70 + i * 30}`} fill="none"
                stroke={i === 1 ? '#8BC34A' : 'rgba(255,255,255,.35)'} strokeWidth={i === 1 ? 1.6 : 0.8}
                className={still ? '' : 'motion-safe:[stroke-dasharray:6_10] motion-safe:animate-[dash_6s_linear_infinite]'} />
            ))}
          </svg>
        </>
      )}
      {kind === 'growth' && (
        <>
          <div className="absolute inset-x-[12%] bottom-[16%] flex h-[56%] items-end gap-[3%]">
            {[28, 40, 36, 52, 61, 58, 74, 88].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-brand-lime/10 to-brand-lime/60" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className={cn('absolute left-[30%] top-[-20%] h-[70%] w-[50%] rounded-full bg-brand-navy/60 blur-[120px]', drift)} />
        </>
      )}
      {/* film grain + vignette for a cinematic finish */}
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay [background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E&quot;)]" />
      <div className="absolute inset-0 shadow-[inset_0_0_160px_40px_rgba(0,0,0,.55)]" />
    </div>
  );
}
