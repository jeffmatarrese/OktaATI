import { Radar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { PendingDetection } from '@/store/alertsStore';

interface Props {
  pending: PendingDetection;
}

export function PendingAlertRow({ pending }: Props) {
  return (
    <div
      data-testid="alert-row-pending"
      role="status"
      aria-live="polite"
      className="flex w-full flex-col gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-left"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{pending.agentName}</div>
          <div className="text-[11px] text-muted-foreground">Lab Agent</div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          <Radar className="h-3 w-3 animate-pulse" />
          Detecting…
        </span>
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{pending.title}</p>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
