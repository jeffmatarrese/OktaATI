import { useEffect, useMemo, useRef, useState } from 'react';
import { useAlertsStore } from '@/store/alertsStore';
import { AlertListItem } from '@/components/Alerts/AlertListItem';
import { AlertDetail } from '@/components/Alerts/AlertDetail';
import { PendingAlertRow } from '@/components/Alerts/PendingAlertRow';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [takenOpen, setTakenOpen] = useState(false);
  // On mobile (< lg) we render either the list or the detail. Desktop shows both.
  const [mobileDetail, setMobileDetail] = useState(false);
  // Alerts that just transitioned to actionTaken — kept in the needs-action
  // section briefly so the row can animate out instead of vanishing.
  const [resolving, setResolving] = useState<Set<string>>(new Set());
  const prevHadAction = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    const newlyResolved: string[] = [];
    alerts.forEach((a) => {
      const had = prevHadAction.current.get(a.id) ?? false;
      if (a.actionTaken && !had) newlyResolved.push(a.id);
      prevHadAction.current.set(a.id, !!a.actionTaken);
    });
    if (newlyResolved.length === 0) return;
    setResolving((prev) => {
      const next = new Set(prev);
      newlyResolved.forEach((id) => next.add(id));
      return next;
    });
    const timers = newlyResolved.map((id) =>
      setTimeout(() => {
        setResolving((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 900),
    );
    return () => { timers.forEach(clearTimeout); };
  }, [alerts]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileDetail(true);
  };

  useEffect(() => {
    const flashed = alerts.find((a) => a.flash);
    if (!flashed) return;
    setSelectedId(flashed.id);
    const t = setTimeout(() => clearFlash(flashed.id), 6000);
    return () => clearTimeout(t);
  }, [alerts, clearFlash]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? alerts
      : alerts.filter((a) =>
          `${a.agentName} ${a.title} ${a.summary}`.toLowerCase().includes(q),
        );
    const rank: Record<string, number> = { T3: 3, T2: 2, T1: 1, Normal: 0 };
    // Stable sort by tier desc; insertion order preserved within a tier.
    return [...base].sort((a, b) => (rank[b.tier] ?? 0) - (rank[a.tier] ?? 0));
  }, [alerts, query]);

  // Alerts mid-resolution stay in the needs-action list so they can animate out.
  const needsAction = useMemo(
    () => searched.filter((a) => !a.actionTaken || resolving.has(a.id)),
    [searched, resolving],
  );
  const actionTaken = useMemo(
    () => searched.filter((a) => a.actionTaken && !resolving.has(a.id)),
    [searched, resolving],
  );

  const counts = { all: searched.length, 'needs-action': needsAction.length, 'action-taken': actionTaken.length };

  const selected = alerts.find((a) => a.id === selectedId) ?? null;

  const showNeeds = filter === 'all' || filter === 'needs-action';
  const showTaken = filter === 'all' || filter === 'action-taken';

  return (
    <div className="grid h-full grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2">
      <section className={cn('min-h-0 overflow-y-auto border-r bg-muted/20 p-3', mobileDetail && 'hidden lg:block')}>
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
        <div className="flex flex-col gap-2">
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
                <div
                  key={a.id}
                  className={cn(
                    'overflow-hidden transition-all duration-700 ease-in',
                    resolving.has(a.id)
                      ? 'max-h-0 -translate-x-2 opacity-0'
                      : 'max-h-40 translate-x-0 opacity-100',
                  )}
                >
                  <AlertListItem
                    alert={a}
                    selected={a.id === selectedId}
                    onSelect={handleSelect}
                  />
                </div>
              ))}
            </div>
          )}

          {showTaken && (
            <div className={cn('flex flex-col gap-2', filter === 'all' && 'mt-6')}>
              {filter === 'all' ? (
                <button
                  type="button"
                  onClick={() => setTakenOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-md py-1 text-left hover:bg-accent/30"
                  aria-expanded={takenOpen}
                >
                  {takenOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Action taken</h3>
                  <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">{actionTaken.length}</span>
                  <div className="ml-1 h-px flex-1 bg-border" />
                </button>
              ) : actionTaken.length === 0 ? (
                <EmptySection label="No actions taken yet." />
              ) : null}
              {(filter !== 'all' || takenOpen) && actionTaken.map((a) => (
                <AlertListItem
                  key={a.id}
                  alert={a}
                  selected={a.id === selectedId}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={cn('min-h-0 overflow-y-auto bg-card', !mobileDetail && 'hidden lg:block')}>
        <div className="border-b bg-card px-3 py-2 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setMobileDetail(false)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to alerts
          </Button>
        </div>
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
