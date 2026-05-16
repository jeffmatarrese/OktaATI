import { useEffect } from 'react';
import { useLabStore } from '@/store/labStore';

export default function ScenarioLabPage() {
  const openDrawer = useLabStore((s) => s.openDrawer);
  useEffect(() => { openDrawer(); }, [openDrawer]);
  return (
    <div className="p-6 text-sm text-muted-foreground">
      The Scenario Lab is shown in the side drawer (opened automatically).
    </div>
  );
}
