import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, EyeOff, Sparkles } from 'lucide-react';
import type { Alert } from '@/data/alerts';
import type { Enforcement, Tier } from '@/lib/tiers';
import { TierBadge } from './TierBadge';
import { cn } from '@/lib/utils';

const TRIAGE_BORDER: Record<Exclude<Tier, 'Normal'>, string> = {
  T1: 'border-l-yellow-400',
  T2: 'border-l-orange-400',
  T3: 'border-l-red-500',
};

const ACTION_PAST: Record<Exclude<Enforcement, 'None'>, string> = {
  'Stall':          'Stalled',
  'Restrict Scope': 'Scope restricted',
  'Session Kill':   'Session killed',
};

interface Props {
  alert: Alert;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function AlertListItem({ alert, selected, onSelect }: Props) {
  const action = alert.actionTaken;
  const dismissed = alert.dismissedAt;
  const resolved = action || dismissed;
  const tier = alert.tier as Exclude<Tier, 'Normal'>;
  return (
    <button
      type="button"
      data-testid={`alert-row-${alert.id}`}
      onClick={() => onSelect(alert.id)}
      className={cn(
        'flex w-full flex-col gap-1 overflow-hidden rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-accent/30',
        !resolved && cn('border-l-4', TRIAGE_BORDER[tier]),
        resolved && 'bg-muted/40 text-muted-foreground',
        selected && 'border-primary bg-primary/5',
        alert.flash && 'border-primary ring-2 ring-primary/70 shadow-[0_0_0_4px_hsl(var(--primary)/0.15)] animate-in slide-in-from-top-4 fade-in-0 ease-out duration-1000',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn('truncate text-sm font-medium', !resolved && 'text-foreground')}>
            {alert.agentName}
          </span>
          {alert.flash && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-primary/50 bg-primary/10 px-1 py-0 text-[10px] font-semibold uppercase tracking-wide text-primary animate-pulse">
              <Sparkles className="h-2.5 w-2.5" />
              New
            </span>
          )}
        </div>
        <TierBadge tier={alert.tier} />
      </div>
      <p className="line-clamp-1 text-xs text-muted-foreground">{alert.summary}</p>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {action ? (
          <>
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span className="font-medium text-emerald-700">{ACTION_PAST[action.enforcement]}</span>
            <span>· {formatDistanceToNow(new Date(action.takenAt))} ago</span>
          </>
        ) : dismissed ? (
          <>
            <EyeOff className="h-3 w-3" />
            <span className="font-medium">Dismissed</span>
            <span>· {formatDistanceToNow(new Date(dismissed))} ago</span>
          </>
        ) : (
          <span>{formatDistanceToNow(new Date(alert.detectedAt))} ago</span>
        )}
      </div>
    </button>
  );
}
