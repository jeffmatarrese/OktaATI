import { useState } from 'react';
import { Eye, EyeOff, Send } from 'lucide-react';
import { labScenarios, type LabScenario } from '@/data/scenarios';
import { Button } from '@/components/ui/button';
import { tierLabel, tierColorClass } from '@/lib/tiers';
import { cn } from '@/lib/utils';

interface Props {
  onSend: (scenarioId: string) => void;
  disabled?: boolean;
}

export function ScenarioPicker({ onSend, disabled }: Props) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pick a scenario
      </h3>
      {labScenarios.map((s) => <Card key={s.id} s={s} revealed={revealed.has(s.id)} onToggle={() => toggle(s.id)} onSend={() => onSend(s.id)} disabled={disabled} />)}
    </div>
  );
}

function Card({ s, revealed, onToggle, onSend, disabled }: {
  s: LabScenario; revealed: boolean;
  onToggle: () => void; onSend: () => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3" data-testid={`lab-scenario-${s.id}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.difficulty} · {s.id}</div>
          <div className="truncate text-sm font-medium">{s.title}</div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label={revealed ? 'Hide ground truth' : 'Reveal ground truth'}
          className="text-muted-foreground hover:text-foreground"
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{s.description}</p>
      {revealed && (
        <div className={cn('rounded border px-2 py-1 text-[11px]', tierColorClass(s.groundTruthTier))}>
          Ground truth: {tierLabel(s.groundTruthTier)}
        </div>
      )}
      <Button size="sm" className="self-end gap-1" disabled={disabled} onClick={onSend}>
        <Send className="h-3.5 w-3.5" /> Send to ATI
      </Button>
    </div>
  );
}
