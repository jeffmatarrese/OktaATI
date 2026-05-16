import { cn } from "@/lib/utils";
import type { Severity } from "@/data/alerts";

const map: Record<Severity, { label: string; cls: string; dot: string }> = {
  low: {
    label: "Low",
    cls: "bg-severity-low/10 text-severity-low border-severity-low/20",
    dot: "bg-severity-low",
  },
  medium: {
    label: "Medium",
    cls: "bg-severity-medium/10 text-severity-medium border-severity-medium/20",
    dot: "bg-severity-medium",
  },
  high: {
    label: "High",
    cls: "bg-severity-high/10 text-severity-high border-severity-high/20",
    dot: "bg-severity-high",
  },
  critical: {
    label: "Critical",
    cls: "bg-severity-critical/10 text-severity-critical border-severity-critical/30",
    dot: "bg-severity-critical",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const m = map[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        m.cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const tone =
    value >= 85
      ? "bg-success"
      : value >= 70
        ? "bg-primary"
        : value >= 55
          ? "bg-warning"
          : "bg-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums text-muted-foreground">{value}%</span>
    </div>
  );
}
