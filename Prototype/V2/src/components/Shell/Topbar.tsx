import { Bell, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLabStore } from '@/store/labStore';

export function Topbar() {
  const openDrawer = useLabStore((s) => s.openDrawer);
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Identity Threat Protection</span>
        <span className="opacity-50">/</span>
        <span>Alerts</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="font-mono text-xs">
          Prod · acme.okta.com
        </Badge>
        <Button
          variant="default"
          size="sm"
          onClick={openDrawer}
          className="gap-1.5"
          data-testid="topbar-open-lab"
        >
          <FlaskConical className="h-4 w-4" /> Scenario Lab
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="h-7 w-7 rounded-full bg-muted" aria-label="User avatar" />
      </div>
    </header>
  );
}
