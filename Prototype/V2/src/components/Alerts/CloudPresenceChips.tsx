import type { CloudProvider } from '@/data/alerts';
import { cn } from '@/lib/utils';

const COLORS: Record<CloudProvider, string> = {
  AWS:   'border-orange-300 bg-orange-50 text-orange-800',
  GCP:   'border-blue-300 bg-blue-50 text-blue-800',
  Azure: 'border-sky-300 bg-sky-50 text-sky-800',
};

export function CloudPresenceChips({ clouds, className }: { clouds: CloudProvider[]; className?: string }) {
  if (clouds.length === 0) return null;
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {clouds.map((c) => (
        <span key={c} className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', COLORS[c])}>
          {c}
        </span>
      ))}
    </span>
  );
}
