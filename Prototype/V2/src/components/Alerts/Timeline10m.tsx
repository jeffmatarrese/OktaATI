import { formatDistanceToNow } from 'date-fns';
import type { TimelineEvent } from '@/data/alerts';

export function Timeline10m({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-3 border-l border-border pl-4">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[21px] mt-1.5 h-2 w-2 rounded-full bg-primary" />
          <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.ts))} ago{e.app ? ` · ${e.app}` : ''}</div>
          <div className="text-sm"><span className="font-mono text-xs">{e.event}</span> — {e.detail}</div>
        </li>
      ))}
    </ol>
  );
}
