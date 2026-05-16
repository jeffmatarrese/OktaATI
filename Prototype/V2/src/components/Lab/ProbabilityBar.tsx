import { TIERS, type Tier, tierColorClass } from '@/lib/tiers';
import { cn } from '@/lib/utils';

interface Props { probs: Record<Tier, number>; }

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function ProbabilityBar({ probs }: Props) {
  const top = TIERS.reduce<Tier>(
    (acc, t) => (probs[t] > probs[acc] ? t : acc),
    'Normal',
  );
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded border">
        {TIERS.map((t) => (
          <div
            key={t}
            data-testid={`prob-segment-${t}`}
            className={cn('h-full', tierColorClass(t).split(' ')[0], t === top && 'font-semibold')}
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
            className={cn('flex items-center justify-between rounded px-1.5 py-0.5 border', tierColorClass(t), t === top && 'font-semibold')}
          >
            <span>{t}</span>
            <span className="tabular-nums">{pct(probs[t])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
