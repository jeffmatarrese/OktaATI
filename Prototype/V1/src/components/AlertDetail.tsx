import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  PauseCircle,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ActionType, Alert } from "@/data/alerts";
import { SeverityBadge, ConfidenceBar } from "./SeverityBadge";

const ACTIONS: Record<
  ActionType,
  { label: string; icon: typeof PauseCircle; impact: string; destructive?: boolean }
> = {
  stall: {
    label: "Stall",
    icon: PauseCircle,
    impact: "Pauses the agent's current activity. Fully reversible. No workflow data is lost.",
  },
  restrict: {
    label: "Restrict Scope",
    icon: ShieldOff,
    impact:
      "Reduces the agent's permissions to its declared baseline. Workflows continue with limited access.",
  },
  terminate: {
    label: "Terminate Session",
    icon: Zap,
    impact: "Immediately ends the agent session and revokes active tokens. High disruption.",
    destructive: true,
  },
};

export function AlertDetail({ alert, onClose }: { alert: Alert | null; onClose: () => void }) {
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [completedAction, setCompletedAction] = useState<ActionType | null>(null);
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const [overrideMode, setOverrideMode] = useState(false);

  useEffect(() => {
    setPendingAction(null);
    setCompletedAction(null);
    setFeedback(null);
    setOverrideMode(false);
  }, [alert?.id]);

  if (!alert) return null;

  const recommended = ACTIONS[alert.recommendedAction];

  const requestAction = (a: ActionType) => {
    if (ACTIONS[a].destructive) {
      setPendingAction(a);
    } else {
      executeAction(a);
    }
  };

  const executeAction = (a: ActionType) => {
    setCompletedAction(a);
    setPendingAction(null);
    toast.success(`${ACTIONS[a].label} applied to ${alert.agent}`, {
      description: "Action is reversible from the audit log.",
    });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <aside className="flex h-full w-full flex-col overflow-hidden bg-card">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={alert.severity} />
              {alert.verified ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                  <ShieldCheck className="h-3 w-3" /> Verified Data
                </span>
              ) : (
                <span className="rounded-md border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                  Needs Review
                </span>
              )}
              <span className="text-xs text-muted-foreground">#{alert.id}</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold leading-snug">{alert.title}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Bot className="h-4 w-4" />
              <span>{alert.agent}</span>
              <span className="text-border">•</span>
              <span>{alert.agentType}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Decision support */}
          <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              System Recommendation
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <recommended.icon className="h-5 w-5 text-foreground" />
                <span className="text-base font-semibold">{recommended.label}</span>
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                {alert.confidence}% confidence
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{alert.recommendationReason}</p>
            <ConfidenceBar value={alert.confidence} />
            <button
              onClick={() => setOverrideMode((v) => !v)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {overrideMode ? "Hide override options" : "Override recommendation"}
              <ChevronRight className="h-3 w-3" />
            </button>
          </section>

          {/* Action bar */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Take Action
            </h3>
            {completedAction ? (
              <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">
                    {ACTIONS[completedAction].label} applied
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Action logged and reversible from the audit trail.
                </p>
                {!feedback ? (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                    <span className="text-sm font-medium">Was this action correct?</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setFeedback("yes");
                          toast("Thanks — feeding into the learning loop");
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-secondary"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Yes
                      </button>
                      <button
                        onClick={() => {
                          setFeedback("no");
                          toast("Recorded — system will adjust thresholds");
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-secondary"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> No
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Feedback recorded. Precision tuning queued.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ACTIONS) as ActionType[]).map((key) => {
                  const a = ACTIONS[key];
                  const isRecommended = key === alert.recommendedAction;
                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => requestAction(key)}
                          disabled={!overrideMode && !isRecommended}
                          className={cn(
                            "group relative flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            isRecommended
                              ? "border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10"
                              : "border-border bg-card hover:border-foreground/20",
                            a.destructive && !isRecommended && "hover:border-destructive/40",
                          )}
                        >
                          <a.icon
                            className={cn(
                              "h-4 w-4",
                              a.destructive ? "text-destructive" : "text-foreground",
                            )}
                          />
                          <span className="text-sm font-semibold">{a.label}</span>
                          {isRecommended && (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                              Recommended
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="font-medium">{a.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{a.impact}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            )}
            {!completedAction && !overrideMode && (
              <p className="mt-2 text-xs text-muted-foreground">
                Only the recommended action is enabled. Click "Override recommendation" above to
                unlock other actions.
              </p>
            )}
          </section>

          {/* Explanation */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What happened
            </h3>
            <p className="text-sm leading-relaxed text-foreground">{alert.explanation}</p>
          </section>

          {/* Reasons */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Why this was flagged
            </h3>
            <ul className="space-y-2">
              {alert.reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
                  <span className="text-foreground">{r}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Telemetry */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Raw Telemetry
            </h3>
            <div className="overflow-hidden rounded-lg border border-border bg-secondary/50 font-mono text-xs">
              {alert.telemetry.map((t, i) => (
                <div
                  key={i}
                  className="flex gap-3 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <span className="text-muted-foreground">
                    {new Date(t.ts).toLocaleTimeString()}
                  </span>
                  <span className="font-semibold text-primary">{t.event}</span>
                  <span className="truncate text-foreground">{t.detail}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <AlertDialog open={!!pendingAction} onOpenChange={(o) => !o && setPendingAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Confirm {pendingAction && ACTIONS[pendingAction].label}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingAction && ACTIONS[pendingAction].impact} This will affect{" "}
                <span className="font-medium text-foreground">{alert.agent}</span> immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => pendingAction && executeAction(pendingAction)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </aside>
    </TooltipProvider>
  );
}
