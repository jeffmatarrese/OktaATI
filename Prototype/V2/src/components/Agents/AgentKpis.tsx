import { Activity, Eye, AlertTriangle, Users } from 'lucide-react';
import type { Agent } from '@/data/agents';
import { TOTAL_FLEET, ACTIVE_WINDOW_MIN } from '@/data/agents';

interface Props { agents: Agent[]; }

function countActive(agents: Agent[]): number {
  const cutoff = Date.now() - ACTIVE_WINDOW_MIN * 60_000;
  return agents.filter((a) => new Date(a.lastSeen).getTime() >= cutoff).length;
}

export function AgentKpis({ agents }: Props) {
  const total = TOTAL_FLEET;
  const active = countActive(agents);
  const shadow = agents.filter((a) => a.status === 'shadow').length;
  const highRisk = agents.filter((a) => a.risk === 'High').length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Kpi
        label="Agents tracked"
        value={`${agents.length}`}
        sub={`of ${total} in environment`}
        Icon={Users}
        tone="neutral"
      />
      <Kpi
        label="Active now"
        value={`${active}`}
        sub={`last ${ACTIVE_WINDOW_MIN} min`}
        Icon={Activity}
        tone="ok"
      />
      <Kpi
        label="Shadow AI"
        value={`${shadow}`}
        sub="unregistered agents"
        Icon={Eye}
        tone="warn"
      />
      <Kpi
        label="High risk"
        value={`${highRisk}`}
        sub="open triage"
        Icon={AlertTriangle}
        tone="alert"
      />
    </div>
  );
}

type Tone = 'neutral' | 'ok' | 'warn' | 'alert';

const TONE_ICON: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  ok:      'bg-emerald-50 text-emerald-700',
  warn:    'bg-amber-50 text-amber-700',
  alert:   'bg-red-50 text-red-700',
};

function Kpi({
  label, value, sub, Icon, tone,
}: {
  label: string; value: string; sub: string;
  Icon: typeof Users; tone: Tone;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${TONE_ICON[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-semibold tabular-nums">{value}</span>
        </div>
        <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
