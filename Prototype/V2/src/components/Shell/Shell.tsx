import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { LabDrawer } from '@/components/Lab/LabDrawer';

export function Shell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <LabDrawer />
    </div>
  );
}
