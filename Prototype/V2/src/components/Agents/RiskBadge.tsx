import type { RiskLabel } from '@/data/agents';
import { cn } from '@/lib/utils';

const C: Record<RiskLabel, string> = {
  Low:    'bg-slate-100 text-slate-700 border-slate-300',
  Medium: 'bg-amber-50  text-amber-800  border-amber-300',
  High:   'bg-red-50    text-red-800    border-red-300',
};

export function RiskBadge({ risk }: { risk: RiskLabel }) {
  return <span className={cn('rounded border px-1.5 py-0.5 text-[11px] font-medium', C[risk])}>{risk}</span>;
}
