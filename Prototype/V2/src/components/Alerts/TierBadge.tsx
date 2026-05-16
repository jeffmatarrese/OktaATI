import type { Tier } from '@/lib/tiers';
import { tierColorClass, tierLabel } from '@/lib/tiers';
import { cn } from '@/lib/utils';

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <span className={cn('inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium', tierColorClass(tier), className)}>
      {tierLabel(tier)}
    </span>
  );
}
