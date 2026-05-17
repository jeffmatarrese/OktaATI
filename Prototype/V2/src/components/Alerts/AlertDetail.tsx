import type { Alert } from '@/data/alerts';
import { TierBadge } from './TierBadge';
import { EvidenceChain } from './EvidenceChain';
import { Timeline10m } from './Timeline10m';
import { CrossAppContext } from './CrossAppContext';
import { IdentityCard } from './IdentityCard';
import { RecommendedEnforcement } from './RecommendedEnforcement';
import { AuditFooter } from './AuditFooter';
import { Timer } from 'lucide-react';
import { useAlertsStore } from '@/store/alertsStore';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function AlertDetail({ alert }: { alert: Alert }) {
  const applyAction = useAlertsStore((s) => s.applyAction);
  const dismissAlert = useAlertsStore((s) => s.dismissAlert);
  return (
    <article className="flex flex-col gap-6 p-6">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{alert.id}</div>
            <h2 className="text-lg font-semibold">{alert.title}</h2>
            <div className="mt-1 text-sm text-muted-foreground">{alert.agentName} · {alert.agentType}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <TierBadge tier={alert.tier} />
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Timer className="h-3 w-3" /> MTTC {alert.mttc}
            </span>
          </div>
        </div>
        <RecommendedEnforcement
          recommended={alert.enforcement}
          rationale={alert.recommendationRationale}
          actionTaken={alert.actionTaken}
          dismissedAt={alert.dismissedAt}
          onAction={(e) => applyAction(alert.id, e)}
          onDismiss={() => dismissAlert(alert.id)}
        />
      </header>

      <Section title="Why this fired — deterministic evidence chain">
        <EvidenceChain steps={alert.evidenceChain} />
      </Section>

      <Section title="10-minute preceding timeline">
        <Timeline10m events={alert.timeline} />
      </Section>

      <Section title="Cross-app context">
        <CrossAppContext events={alert.crossAppContext} />
      </Section>

      <Section title="Identity & verification">
        <IdentityCard identity={alert.identity} />
      </Section>

      <AuditFooter runId={alert.modelRunId} />
    </article>
  );
}
