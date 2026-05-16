import { Bot, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Alert } from "@/data/alerts";
import { SeverityBadge, ConfidenceBar } from "./SeverityBadge";

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function AlertCard({
  alert,
  active,
  onClick,
}: {
  alert: Alert;
  active: boolean;
  onClick: () => void;
}) {
  const leftBar =
    alert.severity === "critical"
      ? "bg-severity-critical"
      : alert.severity === "high"
        ? "bg-severity-high"
        : alert.severity === "medium"
          ? "bg-severity-medium"
          : "bg-severity-low";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border bg-card p-4 text-left transition-all",
        "hover:border-primary/30 hover:shadow-md",
        active ? "border-primary/40 shadow-md ring-1 ring-primary/20" : "border-border",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", leftBar)} />
      <div className="ml-2 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            {!alert.verified && (
              <span className="rounded-md border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                Needs Review
              </span>
            )}
            <span className="text-xs text-muted-foreground">#{alert.id}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug text-foreground">
            {alert.title}
          </h3>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            <span className="truncate">{alert.agent}</span>
            <span className="text-border">•</span>
            <Clock className="h-3.5 w-3.5" />
            <span>{timeAgo(alert.timestamp)}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{alert.explanation}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {alert.apps.map((a) => (
                <span
                  key={a}
                  className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {a}
                </span>
              ))}
            </div>
            <ConfidenceBar value={alert.confidence} />
          </div>
        </div>
      </div>
    </button>
  );
}
