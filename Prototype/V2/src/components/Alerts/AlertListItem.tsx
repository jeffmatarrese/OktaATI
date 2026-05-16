import { formatDistanceToNow } from 'date-fns';
import { Timer, CheckCircle2 } from 'lucide-react';
import type { Alert } from '@/data/alerts';
import type { Enforcement } from '@/lib/tiers';
import { TierBadge } from './TierBadge';
import { ChangeManagementChip } from './ChangeManagementChip';
import { CloudPresenceChips } from './CloudPresenceChips';
import { cn } from '@/lib/utils';

const ACTION_CHIP: Record<Exclude<Enforcement, 'None'>, string> = {
  'Stall':          'border-amber-300 bg-amber-50 text-amber-900',
  'Restrict Scope': 'border-orange-300 bg-orange-50 text-orange-900',
  'Session Kill':   'border-red-300 bg-red-50 text-red-900',
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
  return (
    <button
      type="button"
      data-testid={`alert-row-${alert.id}`}
      onClick={() => onSelect(alert.id)}
      className={cn(
        'flex w-full flex-col gap-2 rounded-md border bg-card p-3 text-left transition-colors hover:bg-accent/30',
        selected && 'border-primary bg-primary/5',
        alert.flash && 'ring-2 ring-primary/60 animate-pulse',
        alert.actionTaken && 'opacity-70',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{alert.agentName}</div>
          <div className="text-[11px] text-muted-foreground">{alert.agentType}</div>
        </div>
        <TierBadge tier={alert.tier} />
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{alert.summary}</p>
      <div className="flex flex-wrap items-center gap-2">
        <ChangeManagementChip cm={alert.changeManagement} />
        {alert.actionTaken && (
          <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]', ACTION_CHIP[alert.actionTaken.enforcement])}>
            <CheckCircle2 className="h-3 w-3" />
            {ACTION_PAST[alert.actionTaken.enforcement]}
          </span>
        )}
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
