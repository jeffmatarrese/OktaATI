import { Button } from '@/components/ui/button';
import { CircleStop, ShieldAlert, Pause } from 'lucide-react';
import type { Enforcement } from '@/lib/tiers';

const ICONS: Record<Exclude<Enforcement, 'None'>, JSX.Element> = {
  'Stall':          <Pause className="h-3.5 w-3.5" />,
  'Restrict Scope': <ShieldAlert className="h-3.5 w-3.5" />,
  'Session Kill':   <CircleStop className="h-3.5 w-3.5" />,
};

export function RecommendedEnforcement({ enforcement, rationale }: { enforcement: Enforcement; rationale: string }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(['Stall', 'Restrict Scope', 'Session Kill'] as const).map((e) => (
          <Button
            key={e}
            size="sm"
            variant={e === enforcement ? 'default' : 'outline'}
            className="gap-1.5"
          >
            {ICONS[e]} {e}
            {e === enforcement && <span className="ml-1 text-[10px] uppercase opacity-75">Recommended</span>}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{rationale}</p>
    </div>
  );
}
