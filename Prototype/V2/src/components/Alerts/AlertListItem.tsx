import { formatDistanceToNow } from 'date-fns';
import { Timer } from 'lucide-react';
import type { Alert } from '@/data/alerts';
import { TierBadge } from './TierBadge';
import { ChangeManagementChip } from './ChangeManagementChip';
import { CloudPresenceChips } from './CloudPresenceChips';
import { cn } from '@/lib/utils';

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
