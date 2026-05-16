import { CheckCircle2, ShieldOff } from 'lucide-react';
import type { ChangeManagement } from '@/data/alerts';
import { cn } from '@/lib/utils';

export function ChangeManagementChip({ cm, className }: { cm: ChangeManagement; className?: string }) {
  if (cm.status === 'approved') {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800', className)}>
        <CheckCircle2 className="h-3 w-3" />
        Approved · {cm.ticket ?? 'CR'}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] text-red-800', className)}>
      <ShieldOff className="h-3 w-3" />
      No active CR
    </span>
  );
}
