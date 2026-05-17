import { NavLink } from 'react-router-dom';
import { Bell, Shield, Users, FlaskConical, Settings } from 'lucide-react';
import { useLabStore } from '@/store/labStore';
import { cn } from '@/lib/utils';

export const NAV = [
  { kind: 'link' as const, to: '/',         label: 'Alerts',       Icon: Bell },
  { kind: 'link' as const, to: '/agents',   label: 'Agents',       Icon: Users },
  { kind: 'lab'  as const,                   label: 'Scenario Lab', Icon: FlaskConical },
  { kind: 'link' as const, to: '/settings', label: 'Settings',     Icon: Settings },
];

const itemClass = (active: boolean) =>
  cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
    active
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
  );

export function Sidebar() {
  const openDrawer = useLabStore((s) => s.openDrawer);
  return (
    <aside className="hidden w-60 flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-14 items-center gap-2 px-5 border-b border-sidebar-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
          <Shield className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-white">Okta</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/70">
            Identity Threat Protection
          </div>
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {NAV.map((item) => {
          const Icon = item.Icon;
          if (item.kind === 'lab') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={openDrawer}
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
              className={({ isActive }) => itemClass(isActive)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
