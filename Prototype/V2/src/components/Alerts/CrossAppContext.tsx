import type { CrossAppEvent } from '@/data/alerts';
import { CloudPresenceChips } from './CloudPresenceChips';

export function CrossAppContext({ events }: { events: CrossAppEvent[] }) {
  if (events.length === 0) return <p className="text-xs text-muted-foreground">No cross-app activity in window.</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {events.map((e, i) => (
        <div key={i} className="rounded-md border bg-card p-3 text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium">{e.app}</span>
            {e.cloud && <CloudPresenceChips clouds={[e.cloud]} />}
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">{e.event}</div>
          <div className="mt-1">{e.detail}</div>
        </div>
      ))}
    </div>
  );
}
