import { cn } from '@/lib/cn';

/**
 * Real topographic contour lines: a smooth height field (a few hills + long waves) traced with
 * marching squares, so lines never cross, just like a terrain map. Computed once per pattern and
 * cached; rendered as a single static SVG path.
 */
const W = 1600, H = 1100, STEP = 10;

type Hill = [x: number, y: number, height: number, spread: number];
const PATTERNS: Record<string, Hill[]> = {
  a: [[300, 820, 1.25, 260], [980, 520, 1.0, 300], [1380, 180, 0.9, 230], [620, 140, -0.7, 220], [1350, 950, 0.8, 240]],
  b: [[1250, 780, 1.2, 280], [420, 330, 1.05, 260], [820, 980, -0.6, 240], [150, 950, 0.7, 200], [1500, 250, 0.6, 220]],
};

const cache = new Map<string, string>();

function build(key: string, levels: number) {
  const id = `${key}:${levels}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const hills = PATTERNS[key];
  const cols = W / STEP + 1, rows = H / STEP + 1;
  const f = new Float32Array(cols * rows);
  let min = Infinity, max = -Infinity;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i * STEP, y = j * STEP;
    let v = 0.22 * Math.sin(x / 210 + y / 330) + 0.14 * Math.sin(y / 150 - x / 400) + 0.08 * Math.sin((x + y) / 95);
    for (const [hx, hy, h, s] of hills) v += h * Math.exp(-((x - hx) ** 2 + (y - hy) ** 2) / (2 * s * s));
    f[j * cols + i] = v; if (v < min) min = v; if (v > max) max = v;
  }
  const out: string[] = [];
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  for (let l = 1; l < levels; l++) {
    const iso = min + ((max - min) * l) / levels;
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const a = f[j * cols + i], b = f[j * cols + i + 1], c = f[(j + 1) * cols + i + 1], d = f[(j + 1) * cols + i];
      const idx = (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (c > iso ? 2 : 0) | (d > iso ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const x = i * STEP, y = j * STEP;
      const top = () => [lerp(x, x + STEP, (iso - a) / (b - a)), y];
      const right = () => [x + STEP, lerp(y, y + STEP, (iso - b) / (c - b))];
      const bottom = () => [lerp(x, x + STEP, (iso - d) / (c - d)), y + STEP];
      const left = () => [x, lerp(y, y + STEP, (iso - a) / (d - a))];
      const seg = (p: number[], q: number[]) => out.push(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`);
      switch (idx) {
        case 1: case 14: seg(left(), bottom()); break;
        case 2: case 13: seg(bottom(), right()); break;
        case 3: case 12: seg(left(), right()); break;
        case 4: case 11: seg(top(), right()); break;
        case 6: case 9: seg(top(), bottom()); break;
        case 7: case 8: seg(left(), top()); break;
        case 5: seg(left(), top()); seg(bottom(), right()); break;
        case 10: seg(top(), right()); seg(left(), bottom()); break;
      }
    }
  }
  const d = out.join('');
  cache.set(id, d);
  return d;
}

export function TopoLines({ className, tone = 'dark', pattern = 'a', levels = 16 }: { className?: string; tone?: 'dark' | 'light'; pattern?: 'a' | 'b'; levels?: number }) {
  return (
    <svg aria-hidden className={cn('pointer-events-none absolute inset-0 h-full w-full', className)} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <path d={build(pattern, levels)} fill="none" stroke={tone === 'dark' ? 'rgba(239,239,239,.13)' : 'rgba(13,13,13,.08)'}
        strokeWidth={1.3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** The reference dark surface: charcoal, a soft forest glow bottom-left, warm haze right, contour lines on top. */
export function TopoSurface({ className, pattern = 'a' }: { className?: string; pattern?: 'a' | 'b' }) {
  return (
    <div aria-hidden className={cn('absolute inset-0 overflow-hidden bg-[#141614]', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(55%_60%_at_10%_105%,rgba(35,178,74,.16),transparent_70%),radial-gradient(45%_55%_at_95%_35%,rgba(120,110,70,.10),transparent_70%)]" />
      <TopoLines pattern={pattern} className="motion-safe:animate-[topo-drift_40s_ease-in-out_infinite_alternate]" />
    </div>
  );
}
