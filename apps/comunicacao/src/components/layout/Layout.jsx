import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ChannelSidebar from './ChannelSidebar';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ChannelSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Outlet context={{ onOpenSidebar: () => setIsSidebarOpen(true) }} />
      </main>
    </div>
  );
}
