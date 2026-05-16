import type { EvidenceStep } from '@/data/alerts';

export function EvidenceChain({ steps }: { steps: EvidenceStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={s.eventId} className="flex gap-3">
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {i + 1}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium">{s.statement}</div>
            <div className="text-xs text-muted-foreground"><span className="font-medium">Signal: </span>{s.signal}</div>
            <div className="text-[11px] text-muted-foreground">
              <span className="font-mono">{s.policy}</span> · event <span className="font-mono">{s.eventId}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
