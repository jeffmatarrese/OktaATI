import { Button } from '@/components/ui/button';
import { CircleStop, ShieldAlert, Pause, CheckCircle2 } from 'lucide-react';
import type { Enforcement } from '@/lib/tiers';
import type { ActionTaken } from '@/data/alerts';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const ICONS: Record<Exclude<Enforcement, 'None'>, JSX.Element> = {
  'Stall':          <Pause className="h-3.5 w-3.5" />,
  'Restrict Scope': <ShieldAlert className="h-3.5 w-3.5" />,
  'Session Kill':   <CircleStop className="h-3.5 w-3.5" />,
};

const BANNER_STYLE: Record<Exclude<Enforcement, 'None'>, string> = {
  'Stall':          'border-amber-300 bg-amber-50 text-amber-900',
  'Restrict Scope': 'border-orange-300 bg-orange-50 text-orange-900',
  'Session Kill':   'border-red-300 bg-red-50 text-red-900',
};

const PAST_VERB: Record<Exclude<Enforcement, 'None'>, string> = {
  'Stall':          'Stalled',
  'Restrict Scope': 'Scope restricted',
  'Session Kill':   'Session killed',
};

interface Props {
  recommended: Enforcement;
  rationale: string;
  actionTaken?: ActionTaken;
  onAction: (e: Exclude<Enforcement, 'None'>) => void;
}

export function RecommendedEnforcement({ recommended, rationale, actionTaken, onAction }: Props) {
  if (actionTaken) {
    return (
      <div className="space-y-2">
        <div className={cn('flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium', BANNER_STYLE[actionTaken.enforcement])}>
          <CheckCircle2 className="h-4 w-4" />
          {PAST_VERB[actionTaken.enforcement]} · {formatDistanceToNow(new Date(actionTaken.takenAt))} ago
        </div>
        <p className="text-xs text-muted-foreground">{rationale}</p>
        <button
          type="button"
          className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => {
            // Escalation path: clicking the banner-area "Change action" lets the analyst
            // pick a different enforcement. Cycle to the most-severe remaining option.
            const next: Exclude<Enforcement, 'None'> =
              actionTaken.enforcement === 'Stall' ? 'Restrict Scope'
              : actionTaken.enforcement === 'Restrict Scope' ? 'Session Kill'
              : 'Stall';
            onAction(next);
          }}
        >
          Change action → {actionTaken.enforcement === 'Stall' ? 'Restrict Scope' : actionTaken.enforcement === 'Restrict Scope' ? 'Session Kill' : 'Stall'}
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(['Stall', 'Restrict Scope', 'Session Kill'] as const).map((e) => (
          <Button
            key={e}
            size="sm"
            variant={e === recommended ? 'default' : 'outline'}
            className="gap-1.5"
            onClick={() => onAction(e)}
          >
            {ICONS[e]} {e}
            {e === recommended && <span className="ml-1 text-[10px] uppercase opacity-75">Recommended</span>}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{rationale}</p>
    </div>
  );
}
