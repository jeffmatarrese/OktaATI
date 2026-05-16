import type { AgentStatus } from '@/data/agents';
import { ShieldCheck, EyeOff } from 'lucide-react';

export function StatusChip({ status }: { status: AgentStatus }) {
  if (status === 'registered') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-800">
        <ShieldCheck className="h-3 w-3" /> Registered
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-900">
      <EyeOff className="h-3 w-3" /> Shadow AI · Auto-discovered
    </span>
  );
}
