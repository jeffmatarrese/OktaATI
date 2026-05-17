import { NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { NAV } from './Sidebar';
import { useLabStore } from '@/store/labStore';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const itemClass = (active: boolean) =>
  cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
    active
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
  );

export function MobileNav({ open, onOpenChange }: Props) {
  const openLab = useLabStore((s) => s.openDrawer);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5 text-left">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
            <Shield className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="leading-tight">
            <SheetTitle className="text-sm font-semibold tracking-tight text-white">Okta</SheetTitle>
            <SheetDescription className="text-[10px] uppercase tracking-wider text-sidebar-foreground/70">
              Identity Threat Protection
            </SheetDescription>
          </div>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => {
            const Icon = item.Icon;
            if (item.kind === 'lab') {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    openLab();
                  }}
                  className={cn(itemClass(false), 'text-left')}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => onOpenChange(false)}
                className={({ isActive }) => itemClass(isActive)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
