import { TIERS, type Tier } from '@/lib/tiers';
import { cn } from '@/lib/utils';

interface Props { probs: Record<Tier, number>; }

const pct = (n: number) => `${Math.round(n * 100)}%`;

// Saturated tier colors so the bar segments and predicted chip are unmistakable.
const BAR_BG: Record<Tier, string> = {
  Normal: 'bg-slate-400',
  T1: 'bg-yellow-400',
  T2: 'bg-orange-500',
  T3: 'bg-red-500',
};

const CHIP_HIGHLIGHT: Record<Tier, string> = {
  Normal: 'bg-slate-600 text-white border-slate-700',
  T1: 'bg-yellow-500 text-yellow-950 border-yellow-600',
  T2: 'bg-orange-500 text-white border-orange-600',
  T3: 'bg-red-600 text-white border-red-700',
};

export function ProbabilityBar({ probs }: Props) {
  const top = TIERS.reduce<Tier>(
    (acc, t) => (probs[t] > probs[acc] ? t : acc),
    'Normal',
  );
  return (
    <div className="space-y-2">
      <div className="flex h-4 overflow-hidden rounded border">
        {TIERS.map((t) => (
          <div
            key={t}
            data-testid={`prob-segment-${t}`}
            className={cn('h-full', BAR_BG[t], t === top && 'font-semibold')}
            style={{ width: `${probs[t] * 100}%` }}
            title={`${t}: ${pct(probs[t])}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1 text-[11px]">
        {TIERS.map((t) => (
          <div
            key={t}
            data-testid={`prob-segment-${t}`}
            className={cn(
              'flex items-center justify-between rounded border px-1.5 py-0.5',
              t === top
                ? cn('font-semibold', CHIP_HIGHLIGHT[t])
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            <span>{t}</span>
            <span className="tabular-nums">{pct(probs[t])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
