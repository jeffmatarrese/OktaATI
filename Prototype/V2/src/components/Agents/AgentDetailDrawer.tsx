import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { Agent } from '@/data/agents';
import { StatusChip } from './StatusChip';
import { RiskBadge } from './RiskBadge';
import { useAlertsStore } from '@/store/alertsStore';
import { AlertListItem } from '@/components/Alerts/AlertListItem';

interface Props { agent: Agent | null; open: boolean; onOpenChange: (v: boolean) => void; }

export function AgentDetailDrawer({ agent, open, onOpenChange }: Props) {
  const alerts = useAlertsStore((s) => s.alerts);
  if (!agent) return null;
  const agentAlerts = alerts.filter((a) => a.agentId === agent.id);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{agent.name}</SheetTitle>
          <SheetDescription className="font-mono text-[11px]">{agent.identity}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex gap-2"><StatusChip status={agent.status} /><RiskBadge risk={agent.risk} /></div>

          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Baseline behavior</h3>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Typical scopes</dt><dd>{agent.baseline.typicalScopes.join(', ')}</dd>
              <dt className="text-muted-foreground">Typical apps</dt><dd>{agent.baseline.typicalApps.join(', ')}</dd>
              <dt className="text-muted-foreground">Typical geos</dt><dd>{agent.baseline.typicalGeos.join(', ')}</dd>
              <dt className="text-muted-foreground">Typical hours</dt><dd>{agent.baseline.typicalHoursUtc}</dd>
            </dl>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Recent alerts</h3>
            {agentAlerts.length === 0
              ? <p className="text-xs text-muted-foreground">No open alerts for this agent.</p>
              : <div className="flex flex-col gap-2">{agentAlerts.map((a) => <AlertListItem key={a.id} alert={a} selected={false} onSelect={() => {}} />)}</div>
            }
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
