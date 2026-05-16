import { useMemo, useState } from "react";
import { Activity, Bell, Filter, Search, Shield, Sparkles } from "lucide-react";
import { alerts as mockAlerts, type Severity } from "@/data/alerts";
import { AlertCard } from "@/components/AlertCard";
import { AlertDetail } from "@/components/AlertDetail";
import { cn } from "@/lib/utils";

const FILTERS: { key: "all" | Severity; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

const Index = () => {
  const [selectedId, setSelectedId] = useState<string | null>(mockAlerts[0]?.id ?? null);
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return mockAlerts.filter((a) => {
      if (filter !== "all" && a.severity !== filter) return false;
      if (query && !`${a.agent} ${a.title}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [filter, query]);

  const selected = mockAlerts.find((a) => a.id === selectedId) ?? null;

  const counts = useMemo(
    () => ({
      critical: mockAlerts.filter((a) => a.severity === "critical").length,
      high: mockAlerts.filter((a) => a.severity === "high").length,
      open: mockAlerts.length,
      mttic: "1m 42s",
    }),
    [],
  );

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-14 items-center gap-2 px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
            <Shield className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="text-sm font-semibold tracking-tight text-white">Okta Workforce</div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4 text-sm">
          {[
            { label: "Overview", icon: Activity },
            { label: "Agent Governance", icon: Sparkles, active: true },
            { label: "Identities", icon: Shield },
            { label: "Alerts", icon: Bell },
          ].map((item) => (
            <button
              key={item.label}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors",
                item.active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/70">
          <div className="font-medium text-white">SOC Console</div>
          <div className="mt-0.5">acme-corp · production</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
          <div>
            <h1 className="text-base font-semibold tracking-tight">Autonomous Agent Governance</h1>
            <p className="text-xs text-muted-foreground">
              Real-time risk detection &amp; confidence-calibrated containment
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-xs md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              <span className="text-muted-foreground">Telemetry healthy</span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              JM
            </div>
          </div>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 border-b border-border bg-card px-6 py-4 md:grid-cols-4">
          <Stat label="Open alerts" value={counts.open} accent="text-foreground" />
          <Stat label="Critical" value={counts.critical} accent="text-severity-critical" />
          <Stat label="High" value={counts.high} accent="text-severity-high" />
          <Stat label="MTTIC (24h)" value={counts.mttic} accent="text-primary" trend="↓ 52%" />
        </section>

        {/* Content split */}
        <div className="flex min-h-0 flex-1">
          {/* Alerts column */}
          <div className="flex min-w-0 flex-1 flex-col border-r border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-3">
              <div className="flex items-center gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      filter === f.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search agents…"
                    className="h-8 w-48 rounded-md border border-border bg-background pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
                <button className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-secondary">
                  <Filter className="h-3.5 w-3.5" /> Filters
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto bg-background px-6 py-4">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No alerts match your filters.
                </div>
              ) : (
                filtered.map((a) => (
                  <AlertCard
                    key={a.id}
                    alert={a}
                    active={a.id === selectedId}
                    onClick={() => setSelectedId(a.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Detail column */}
          <div className="hidden w-[480px] flex-shrink-0 xl:block">
            {selected ? (
              <AlertDetail alert={selected} onClose={() => setSelectedId(null)} />
            ) : (
              <div className="flex h-full items-center justify-center bg-card text-sm text-muted-foreground">
                Select an alert to inspect
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile detail overlay */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-foreground/40 xl:hidden" onClick={() => setSelectedId(null)}>
          <div
            className="absolute inset-y-0 right-0 w-full max-w-md bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <AlertDetail alert={selected} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}
    </div>
  );
};

function Stat({
  label,
  value,
  accent,
  trend,
}: {
  label: string;
  value: number | string;
  accent?: string;
  trend?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className={cn("text-2xl font-semibold tabular-nums", accent)}>{value}</div>
        {trend && <span className="text-xs font-medium text-success">{trend}</span>}
      </div>
    </div>
  );
}

export default Index;
