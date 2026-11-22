import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BarChart3, Bell, CheckCircle2, FileSpreadsheet, MessagesSquare, PhoneCall, Users2, XCircle } from 'lucide-react';
import { Reveal } from '@/lib/animations/components';
import { AppWindow } from './previews';
import { TopoSurface } from '@/components/brand/TopoLines';

gsap.registerPlugin(ScrollTrigger);

const PROBLEMS = [
  { icon: FileSpreadsheet, title: 'Scattered lead information', body: 'Contacts live in sheets, inboxes and personal notes.', pos: [-250, -170, -6] },
  { icon: Bell, title: 'Manual follow-ups', body: 'Callbacks depend on someone remembering.', pos: [235, -185, 5] },
  { icon: MessagesSquare, title: 'Unorganised communication', body: 'Calls, emails and WhatsApp never meet in one place.', pos: [-275, 70, 4] },
  { icon: BarChart3, title: 'No sales visibility', body: 'Nobody can say what is stuck, or why.', pos: [255, 80, -5] },
  { icon: Users2, title: 'Hard to measure the team', body: 'Targets are tracked after the month is over.', pos: [-10, 205, 3] },
] as const;

const W = 680, H = 540, CX = W / 2, CY = H / 2;

function SolutionPanel() {
  return (
    <AppWindow title="Account · Northwind Logistics" className="w-[340px]">
      <div className="space-y-2 text-[11.5px]">
        <div className="flex items-center justify-between rounded-lg bg-white px-2.5 py-2 ring-1 ring-line"><span className="font-medium">Stage</span><span className="rounded bg-brand-navy-50 px-1.5 font-medium text-brand-navy">L1 done</span></div>
        {[[PhoneCall, 'Call with CFO · L1 booked', '2d ago'], [CheckCircle2, 'Follow-up task created automatically', 'today'], [Users2, 'Finance + HR engaged', 'live']].map(([I, t, w]) => {
          const Icon = I as typeof PhoneCall;
          return (
            <div key={t as string} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-line">
              <Icon className="h-3.5 w-3.5 text-brand-forest" /><span className="flex-1">{t as string}</span><span className="text-ink-muted">{w as string}</span>
            </div>
          );
        })}
      </div>
    </AppWindow>
  );
}

export function ProblemSolution() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root);
      q('.ps-line').forEach((l) => { const len = (l as unknown as SVGLineElement).getTotalLength(); gsap.set(l, { strokeDasharray: len, strokeDashoffset: len }); });
      PROBLEMS.forEach((p, i) => gsap.set(q(`.ps-card-${i}`), { x: p.pos[0], y: p.pos[1], rotate: p.pos[2] }));
      gsap.set(q('.ps-solution'), { opacity: 0, scale: 0.85, y: 30 });
      gsap.set(q('.ps-copy-solution'), { opacity: 0, y: 20 });

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: { trigger: q('.ps-pin')[0], start: 'top top', end: '+=160%', scrub: 0.7, pin: true, anticipatePin: 1 },
      });
      tl.to(q('.ps-line'), { strokeDashoffset: 0, duration: 0.3, stagger: 0.04 }, 0)
        .to(q('.ps-hub'), { scale: 1.15, opacity: 1, duration: 0.25 }, 0.15)
        .to(PROBLEMS.map((_, i) => q(`.ps-card-${i}`)[0]), { x: 0, y: 0, rotate: 0, scale: 0.55, opacity: 0, duration: 0.4, stagger: 0.035 }, 0.35)
        .to(q('.ps-line'), { opacity: 0, duration: 0.2 }, 0.55)
        .to(q('.ps-hub'), { opacity: 0, scale: 2, duration: 0.25 }, 0.6)
        .to(q('.ps-copy-problem'), { opacity: 0, y: -20, duration: 0.2 }, 0.5)
        .to(q('.ps-copy-solution'), { opacity: 1, y: 0, duration: 0.25 }, 0.62)
        .to(q('.ps-solution'), { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power3.out' }, 0.62)
        .to({}, { duration: 0.15 });
    });
    return () => mm.revert();
  }, []);

  return (
    <section id="story" ref={root} className="relative bg-canvas">
      {/* Desktop: pinned, scroll-scrubbed story */}
      <div className="ps-pin hidden h-screen overflow-hidden px-8 pb-6 pt-[88px] lg:block motion-reduce:!hidden">
        <div className="relative isolate mx-auto flex h-full max-w-7xl items-center overflow-hidden rounded-[40px] text-paper">
        <TopoSurface className="-z-20" />
        <div className="absolute right-[18%] top-1/2 -z-10 h-[520px] w-[620px] -translate-y-1/2 rounded-full bg-brand-mint/[0.12] blur-[120px]" />
        <div className="grid w-full grid-cols-[0.8fr_1.2fr] items-center gap-10 px-12">
          <div className="relative min-h-[260px]">
            <div className="ps-copy-problem absolute inset-0">
              <p className="eyebrow-dark"><span className="h-1.5 w-1.5 rounded-full bg-[#23B24A]" />The problem</p>
              <h2 className="mt-5 text-[52px] font-medium leading-[1.02] tracking-[-0.045em]">Sales work is scattered <span className="text-[#23B24A]">across five places.</span></h2>
              <p className="mt-4 max-w-[40ch] text-[16px] text-paper/65">Leads slip, follow-ups depend on memory, and managers find out a deal stalled weeks after it did.</p>
            </div>
            <div className="ps-copy-solution absolute inset-0">
              <p className="eyebrow-dark"><span className="h-1.5 w-1.5 rounded-full bg-brand-mint" />The Prosperr way</p>
              <h2 className="mt-5 text-[52px] font-medium leading-[1.02] tracking-[-0.045em]">One account. One timeline. <span className="dim-dark">Every next step.</span></h2>
              <p className="mt-4 max-w-[40ch] text-[16px] text-paper/65">Calls, meetings, owners and stage rules live on one record, so the CRM creates the follow-up instead of your memory.</p>
            </div>
          </div>
          <div className="relative mx-auto" style={{ width: W, height: H }}>
            {/* particles */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              {Array.from({ length: 14 }).map((_, i) => (
                <span key={i} className="absolute bottom-0 h-1 w-1 rounded-full bg-brand-mint/60 motion-safe:animate-[rise_9s_linear_infinite]"
                  style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i * 0.7) % 9}s`, opacity: 0 }} />
              ))}
            </div>
            <svg className="absolute inset-0" width={W} height={H} aria-hidden>
              {PROBLEMS.map((p, i) => (
                <line key={i} className="ps-line" x1={CX + p.pos[0]} y1={CY + p.pos[1]} x2={CX} y2={CY} stroke="#23B24A" strokeOpacity={0.6} strokeWidth={1.5} strokeLinecap="round" />
              ))}
            </svg>
            <div className="ps-hub absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-mint opacity-0 shadow-[0_0_30px_8px_rgba(35,178,74,.6)]" />
            {PROBLEMS.map((p, i) => (
              <div key={p.title} className={`ps-card-${i} absolute left-1/2 top-1/2 -ml-[115px] -mt-[44px] w-[230px] rounded-[22px] border border-white/10 bg-[#101311]/85 p-4 shadow-[0_24px_50px_-20px_rgba(0,0,0,.7)] backdrop-blur-xl`}>
                <p className="flex items-center gap-2 text-[13px] font-semibold text-paper"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#23B24A]/15"><p.icon className="h-3.5 w-3.5 text-[#23B24A]" /></span>{p.title}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-paper/55">{p.body}</p>
              </div>
            ))}
            <div className="ps-solution absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="absolute -inset-10 -z-10 rounded-full bg-brand-mint/25 blur-3xl" />
              <SolutionPanel />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Mobile / reduced motion: same story, stacked */}
      <div className="px-5 py-4 lg:hidden motion-reduce:lg:block">
        <div className="relative isolate mx-auto max-w-3xl overflow-hidden rounded-[32px] px-6 py-10 text-paper">
        <TopoSurface className="-z-20" />
        <Reveal>
          <p className="eyebrow-dark"><span className="h-1.5 w-1.5 rounded-full bg-brand-mint" />The problem</p>
          <h2 className="mt-3 text-[32px] font-medium leading-[1.05] tracking-[-0.04em]">Sales work is scattered across five places.</h2>
        </Reveal>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.05}>
              <div className="flex gap-3 rounded-2xl border border-white/10 bg-[#101311]/85 p-4 backdrop-blur"><XCircle className="h-4 w-4 shrink-0 text-[#23B24A]" /><div><p className="text-[14px] font-semibold text-paper">{p.title}</p><p className="text-[13px] text-paper/55">{p.body}</p></div></div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-12">
          <p className="eyebrow-dark"><span className="h-1.5 w-1.5 rounded-full bg-brand-mint" />The Prosperr way</p>
          <h2 className="mt-3 text-[32px] font-medium leading-[1.05] tracking-[-0.04em]">One account. One timeline. Every next step.</h2>
          <div className="mt-6 flex justify-center"><SolutionPanel /></div>
        </Reveal>
      </div>
      </div>
    </section>
  );
}
