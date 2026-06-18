import { Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { EmpresaProvider } from '@/context/EmpresaContext';

export default function Layout() {
  return (
    <EmpresaProvider>
      <div className="min-h-screen bg-[#f4f4f4]">
        <Navbar />
        <main>
          <Outlet />
        </main>
      </div>
    </EmpresaProvider>
  );
}