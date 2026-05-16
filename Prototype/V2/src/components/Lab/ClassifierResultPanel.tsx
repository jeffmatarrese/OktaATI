import type { ClassifierResult } from '@/services/classifier';
import type { Tier } from '@/lib/tiers';
import { tierLabel, tierColorClass, modelDisplay } from '@/lib/tiers';
import { ProbabilityBar } from './ProbabilityBar';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { result: ClassifierResult; groundTruth: Tier; }

export function ClassifierResultPanel({ result, groundTruth }: Props) {
  const display = modelDisplay(result.model);
  const correct = result.predicted === groundTruth;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <header>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{display.subtitle}</div>
        <div className="text-sm font-semibold">{display.name}</div>
      </header>

      <div className="flex items-center justify-between">
        <span className={cn('rounded-md border px-2 py-1 text-xs font-medium', tierColorClass(result.predicted))}>
          Predicted: {tierLabel(result.predicted)}
        </span>
        <span className={cn('flex items-center gap-1 text-xs', correct ? 'text-emerald-700' : 'text-red-700')}>
          {correct ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {correct ? 'Correct' : 'Incorrect'}
        </span>
      </div>

      {result.model === 'bold_beard' ? (
        <div>
          <div className="mb-1 text-[11px] uppercase text-muted-foreground">Class probabilities</div>
          <ProbabilityBar probs={result.probs} />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-xs">
            <span className="uppercase text-muted-foreground">Self-reported confidence</span>
            <span className="text-base font-semibold tabular-nums">{Math.round(result.confidence * 100)}%</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-4">{result.reasoning}</p>
        </div>
      )}
    </div>
  );
}
