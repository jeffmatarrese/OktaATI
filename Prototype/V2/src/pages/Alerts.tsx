import { useEffect, useMemo, useState } from 'react';
import { useAlertsStore } from '@/store/alertsStore';
import { AlertListItem } from '@/components/Alerts/AlertListItem';
import { AlertDetail } from '@/components/Alerts/AlertDetail';
import { PendingAlertRow } from '@/components/Alerts/PendingAlertRow';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActionFilter = 'all' | 'needs-action' | 'action-taken';

const FILTERS: { id: ActionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'needs-action', label: 'Needs action' },
  { id: 'action-taken', label: 'Action taken' },
];

export default function Alerts() {
  const alerts = useAlertsStore((s) => s.alerts);
  const pending = useAlertsStore((s) => s.pending);
  const clearFlash = useAlertsStore((s) => s.clearFlash);
  const [selectedId, setSelectedId] = useState<string | null>(alerts[0]?.id ?? null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ActionFilter>('all');

  useEffect(() => {
    const flashed = alerts.find((a) => a.flash);
    if (!flashed) return;
    setSelectedId(flashed.id);
    const t = setTimeout(() => clearFlash(flashed.id), 6000);
    return () => clearTimeout(t);
  }, [alerts, clearFlash]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return alerts;
    return alerts.filter((a) =>
      `${a.agentName} ${a.title} ${a.summary}`.toLowerCase().includes(q),
    );
  }, [alerts, query]);

  const needsAction = useMemo(() => searched.filter((a) => !a.actionTaken), [searched]);
  const actionTaken = useMemo(() => searched.filter((a) => a.actionTaken), [searched]);

  const counts = { all: searched.length, 'needs-action': needsAction.length, 'action-taken': actionTaken.length };

  const selected = alerts.find((a) => a.id === selectedId) ?? null;

  const showNeeds = filter === 'all' || filter === 'needs-action';
  const showTaken = filter === 'all' || filter === 'action-taken';

  return (
    <div className="grid h-full grid-cols-1 gap-0 lg:grid-cols-2">
      <section className="border-r bg-muted/20 p-3">
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search alerts…"
            className="pl-8 h-9"
          />
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                filter === f.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent/40',
              )}
            >
              {f.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0 text-[10px]',
                  filter === f.id ? 'bg-primary-foreground/20' : 'bg-muted',
                )}
              >
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {pending && <PendingAlertRow pending={pending} />}

          {showNeeds && (
            <div className="flex flex-col gap-2">
              {filter === 'all' && (
                <SectionHeader label="Action needed" count={needsAction.length} />
              )}
              {needsAction.length === 0 && filter !== 'all' && (
                <EmptySection label="No alerts need action." />
              )}
              {needsAction.map((a) => (
                <AlertListItem
                  key={a.id}
                  alert={a}
                  selected={a.id === selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          )}

          {showTaken && (
            <div className="flex flex-col gap-2">
              {filter === 'all' && actionTaken.length > 0 && (
                <SectionHeader label="Action taken" count={actionTaken.length} />
              )}
              {actionTaken.length === 0 && filter !== 'all' && (
                <EmptySection label="No actions taken yet." />
              )}
              {actionTaken.map((a) => (
                <AlertListItem
                  key={a.id}
                  alert={a}
                  selected={a.id === selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-auto bg-card">
        {selected
          ? <AlertDetail alert={selected} />
          : <div className="p-6 text-sm text-muted-foreground">No alert selected.</div>
        }
      </section>
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</h3>
      <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">{count}</span>
      <div className="ml-1 h-px flex-1 bg-border" />
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}
