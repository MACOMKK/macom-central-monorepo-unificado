import { Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { EmpresaProvider } from '@/context/EmpresaContext';
import { useCrmRealtime } from '@/hooks/useCrmRealtime';

export default function Layout() {
  const realtime = useCrmRealtime(true);

  return (
    <EmpresaProvider>
      <div className="min-h-screen bg-[#f4f4f4]">
        <Navbar realtime={realtime} />
        <main>
          <Outlet />
        </main>
      </div>
    </EmpresaProvider>
  );
}
