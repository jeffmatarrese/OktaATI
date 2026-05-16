import { NavLink } from 'react-router-dom';
import { Bell, Shield, Users, FlaskConical, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NAV = [
  { to: '/',          label: 'Alerts',        Icon: Bell },
  { to: '/agents',    label: 'Agents',        Icon: Users },
  { to: '/lab',       label: 'Scenario Lab',  Icon: FlaskConical },
  { to: '/settings',  label: 'Settings',      Icon: Settings },
] as const;

export function Sidebar() {
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
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
