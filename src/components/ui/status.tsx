import { Flame, Snowflake, Sun } from 'lucide-react';
import { humanize } from '@/lib/format';
import type { EngagementStatus, LifecycleStage, SqlStatus, Temperature } from '@/lib/types';
import { Badge, type Tone } from './ui';

export const STAGES: LifecycleStage[] = ['PROSPECT', 'SQL', 'L1', 'MULTITHREADING', 'L2', 'L3', 'NEGOTIATION', 'WON', 'LOST', 'IMPLEMENTATION'];
export const PIPELINE_STAGES: LifecycleStage[] = ['SQL', 'L1', 'MULTITHREADING', 'L2', 'L3', 'NEGOTIATION', 'WON', 'LOST'];

export const stageLabel: Record<LifecycleStage, string> = {
  PROSPECT: 'Prospect', SQL: 'SQL', L1: 'L1 done', MULTITHREADING: 'Multithreading', L2: 'L2', L3: 'L3',
  NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost', IMPLEMENTATION: 'Implementation',
};

const stageTone: Record<LifecycleStage, Tone> = {
  PROSPECT: 'neutral', SQL: 'info', L1: 'accent', MULTITHREADING: 'accent', L2: 'accent', L3: 'accent',
  NEGOTIATION: 'warning', WON: 'success', LOST: 'danger', IMPLEMENTATION: 'success',
};

export function StageBadge({ stage }: { stage?: LifecycleStage | null }) {
  if (!stage) return null;
  return <Badge tone={stageTone[stage]}>{stageLabel[stage]}</Badge>;
}

const engagementTone: Record<EngagementStatus, Tone> = {
  NOT_CONTACTED: 'neutral', CONTACTED: 'info', CONNECTED: 'accent', MEETING_SCHEDULED: 'success', MEETING_COMPLETED: 'success',
  FOLLOW_UP_PENDING: 'warning', UNRESPONSIVE: 'danger', NOT_RELEVANT: 'neutral', REFERRED: 'info',
};

export function EngagementBadge({ status }: { status: EngagementStatus }) {
  return <Badge tone={engagementTone[status]} dot>{humanize(status)}</Badge>;
}

export function TemperatureBadge({ t }: { t?: Temperature | null }) {
  if (!t) return <span className="text-ink-muted">—</span>;
  const map = { HOT: { tone: 'danger', icon: Flame }, WARM: { tone: 'warning', icon: Sun }, COLD: { tone: 'info', icon: Snowflake } } as const;
  const { tone, icon: Icon } = map[t];
  return <Badge tone={tone}><Icon className="h-3 w-3" />{humanize(t)}</Badge>;
}

const sqlTone: Record<SqlStatus, Tone> = {
  PENDING_QUALIFICATION: 'warning', QUALIFIED_SQL: 'success', REJECTED_NOT_ICP: 'danger', PENDING_SENIOR_CONNECTION: 'warning',
  MEETING_BOOKED: 'accent', NO_SHOW: 'danger', DISQUALIFIED: 'neutral',
};
export function SqlBadge({ status }: { status: SqlStatus }) {
  return <Badge tone={sqlTone[status]}>{humanize(status)}</Badge>;
}

export function StatusBadge({ status }: { status: 'ACTIVE' | 'INACTIVE' }) {
  return <Badge tone={status === 'ACTIVE' ? 'success' : 'neutral'} dot>{humanize(status)}</Badge>;
}

const TRACK: LifecycleStage[] = ['PROSPECT', 'SQL', 'L1', 'L2', 'L3', 'NEGOTIATION', 'WON'];

/** Seven-step progress meter from Prospect to Won (Multithreading counts as L1, Lost / Implementation as the end). */
export function StageMeter({ stage }: { stage?: LifecycleStage | null }) {
  if (!stage) return null;
  const at = stage === 'MULTITHREADING' ? 2 : stage === 'IMPLEMENTATION' ? 6 : stage === 'LOST' ? -1 : TRACK.indexOf(stage);
  return (
    <span className="flex items-center gap-[3px]" title={stageLabel[stage]}>
      {TRACK.map((s, i) => (
        <span key={s} className={i <= at ? (stage === 'WON' || stage === 'IMPLEMENTATION' ? 'h-1.5 w-3 rounded-full bg-brand-mint' : 'h-1.5 w-3 rounded-full bg-brand-forest') : stage === 'LOST' ? 'h-1.5 w-3 rounded-full bg-black/10' : 'h-1.5 w-3 rounded-full bg-black/[0.07]'} />
      ))}
    </span>
  );
}
