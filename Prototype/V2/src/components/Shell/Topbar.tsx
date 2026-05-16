import { Bell, FlaskConical, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLabStore } from '@/store/labStore';

interface Props {
  onOpenNav: () => void;
}

export function Topbar({ onOpenNav }: Props) {
  const openDrawer = useLabStore((s) => s.openDrawer);
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          className="lg:hidden"
          onClick={onOpenNav}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden min-w-0 items-center gap-3 text-sm text-muted-foreground sm:flex">
          <span className="truncate font-medium text-foreground">Identity Threat Protection</span>
          <span className="opacity-50">/</span>
          <span>Alerts</span>
        </div>
        <span className="text-sm font-medium text-foreground sm:hidden">ATI</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Badge variant="outline" className="hidden font-mono text-xs md:inline-flex">
          Prod · acme.okta.com
        </Badge>
        <Button
          variant="default"
          size="sm"
          onClick={openDrawer}
          className="gap-1.5"
          data-testid="topbar-open-lab"
        >
          <FlaskConical className="h-4 w-4" />
          <span className="hidden sm:inline">Scenario Lab</span>
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="hidden sm:inline-flex">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="h-7 w-7 rounded-full bg-muted" aria-label="User avatar" />
      </div>
    </header>
  );
}
