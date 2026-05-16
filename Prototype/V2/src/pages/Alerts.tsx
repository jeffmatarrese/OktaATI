import { useEffect, useMemo, useState } from 'react';
import { useAlertsStore } from '@/store/alertsStore';
import { AlertListItem } from '@/components/Alerts/AlertListItem';
import { AlertDetail } from '@/components/Alerts/AlertDetail';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function Alerts() {
  const alerts = useAlertsStore((s) => s.alerts);
  const clearFlash = useAlertsStore((s) => s.clearFlash);
  const [selectedId, setSelectedId] = useState<string | null>(alerts[0]?.id ?? null);
  const [query, setQuery] = useState('');

  // Whenever a flashed alert lands at the front, select it and clear the flash after 2s.
  useEffect(() => {
    const flashed = alerts.find((a) => a.flash);
    if (!flashed) return;
    setSelectedId(flashed.id);
    const t = setTimeout(() => clearFlash(flashed.id), 2000);
    return () => clearTimeout(t);
  }, [alerts, clearFlash]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return alerts;
    return alerts.filter((a) =>
      `${a.agentName} ${a.title} ${a.summary}`.toLowerCase().includes(q),
    );
  }, [alerts, query]);

  const selected = alerts.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="grid h-full grid-cols-1 gap-0 lg:grid-cols-[360px_1fr]">
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
        <div className="flex flex-col gap-2">
          {filtered.map((a) => (
            <AlertListItem
              key={a.id}
              alert={a}
              selected={a.id === selectedId}
              onSelect={setSelectedId}
            />
          ))}
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
