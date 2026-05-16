import { formatDistanceToNow } from 'date-fns';
import type { Agent } from '@/data/agents';
import { StatusChip } from './StatusChip';
import { RiskBadge } from './RiskBadge';

interface Props { agents: Agent[]; onOpen: (id: string) => void; }

export function AgentDirectory({ agents, onOpen }: Props) {
  return (
    <table className="w-full text-sm">
      <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
        <tr className="border-b">
          <th className="px-3 py-2 text-left">Agent</th>
          <th className="px-3 py-2 text-left">Identity</th>
          <th className="px-3 py-2 text-left">Type</th>
          <th className="px-3 py-2 text-left">Owner</th>
          <th className="px-3 py-2 text-left">Status</th>
          <th className="px-3 py-2 text-left">Risk</th>
          <th className="px-3 py-2 text-left">Last seen</th>
          <th className="px-3 py-2 text-left">Open alerts</th>
        </tr>
      </thead>
      <tbody>
        {agents.map((a) => (
          <tr
            key={a.id}
            className="cursor-pointer border-b hover:bg-accent/20"
            onClick={() => onOpen(a.id)}
            data-testid={`agent-row-${a.id}`}
          >
            <td className="px-3 py-2 font-medium">{a.name}</td>
            <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{a.identity}</td>
            <td className="px-3 py-2">{a.type}</td>
            <td className="px-3 py-2">{a.ownerTeam}</td>
            <td className="px-3 py-2"><StatusChip status={a.status} /></td>
            <td className="px-3 py-2"><RiskBadge risk={a.risk} /></td>
            <td className="px-3 py-2 text-muted-foreground">{formatDistanceToNow(new Date(a.lastSeen))} ago</td>
            <td className="px-3 py-2 tabular-nums">{a.openAlertCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
