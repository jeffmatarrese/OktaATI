import { formatDistanceToNow } from 'date-fns';
import { Timer, CheckCircle2, Sparkles, CircleStop, ShieldAlert, Pause } from 'lucide-react';
import type { Alert } from '@/data/alerts';
import type { Enforcement } from '@/lib/tiers';
import { TierBadge } from './TierBadge';
import { ChangeManagementChip } from './ChangeManagementChip';
import { CloudPresenceChips } from './CloudPresenceChips';
import { cn } from '@/lib/utils';

const ACTION_BANNER: Record<Exclude<Enforcement, 'None'>, string> = {
  'Stall':          'border-amber-300 bg-amber-100 text-amber-950',
  'Restrict Scope': 'border-orange-300 bg-orange-100 text-orange-950',
  'Session Kill':   'border-red-300 bg-red-100 text-red-950',
};
const ACTION_BORDER: Record<Exclude<Enforcement, 'None'>, string> = {
  'Stall':          'border-l-amber-400',
  'Restrict Scope': 'border-l-orange-400',
  'Session Kill':   'border-l-red-500',
};
const ACTION_PAST: Record<Exclude<Enforcement, 'None'>, string> = {
  'Stall':          'Stalled',
  'Restrict Scope': 'Scope restricted',
  'Session Kill':   'Session killed',
};
const ACTION_ICON: Record<Exclude<Enforcement, 'None'>, JSX.Element> = {
  'Stall':          <Pause className="h-4 w-4" />,
  'Restrict Scope': <ShieldAlert className="h-4 w-4" />,
  'Session Kill':   <CircleStop className="h-4 w-4" />,
};

interface Props {
  alert: Alert;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function AlertListItem({ alert, selected, onSelect }: Props) {
  const action = alert.actionTaken;
  return (
    <button
      type="button"
      data-testid={`alert-row-${alert.id}`}
      onClick={() => onSelect(alert.id)}
      className={cn(
        'flex w-full flex-col gap-2 overflow-hidden rounded-md border bg-card p-3 text-left transition-colors hover:bg-accent/30',
        selected && 'border-primary bg-primary/5',
        alert.flash && 'border-primary ring-2 ring-primary/70 shadow-[0_0_0_4px_hsl(var(--primary)/0.15)] animate-in slide-in-from-top-2 fade-in duration-500',
        action && cn('border-l-4', ACTION_BORDER[action.enforcement]),
      )}
    >
      {action && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold',
            ACTION_BANNER[action.enforcement],
          )}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate uppercase tracking-wide">
            {ACTION_PAST[action.enforcement]}
          </span>
          <span className="text-[10px] font-medium opacity-80">
            {formatDistanceToNow(new Date(action.takenAt))} ago
          </span>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{alert.agentName}</div>
            <div className="text-[11px] text-muted-foreground">{alert.agentType}</div>
          </div>
          {alert.flash && (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/50 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary animate-pulse">
              <Sparkles className="h-3 w-3" />
              New
            </span>
          )}
        </div>
        <TierBadge tier={alert.tier} />
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{alert.summary}</p>
      <div className="flex flex-wrap items-center gap-2">
        <ChangeManagementChip cm={alert.changeManagement} />
        <CloudPresenceChips clouds={alert.cloudPresence} />
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Timer className="h-3 w-3" />
          MTTC {alert.mttc}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Detected {formatDistanceToNow(new Date(alert.detectedAt))} ago
      </div>
    </button>
  );
}
