import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { applyTheme, getInitialTheme } from '@macom/ui';
import ChannelSidebar from './ChannelSidebar';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ChannelSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Outlet context={{ onOpenSidebar: () => setIsSidebarOpen(true) }} />
      </main>
    </div>
  );
}
