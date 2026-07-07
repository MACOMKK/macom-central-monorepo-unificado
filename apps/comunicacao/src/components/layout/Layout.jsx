import { Outlet } from 'react-router-dom';
import ChannelSidebar from './ChannelSidebar';

export default function Layout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ChannelSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
