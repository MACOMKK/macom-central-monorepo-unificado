import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Clientes from '@/pages/Clientes';
import Eventos from '@/pages/Eventos';
import Leads from '@/pages/Leads';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import ConfiguracaoDistribuicao from '@/pages/ConfiguracaoDistribuicao';
import { useCrmRealtime } from '@/hooks/useCrmRealtime';

const getFromPath = (search) => {
  const params = new URLSearchParams(search);
  const from = params.get('from');
  if (!from) return '/leads';

  try {
    const decoded = decodeURIComponent(from);
    return decoded.startsWith('/') ? decoded : '/leads';
  } catch {
    return '/leads';
  }
};

const LoadingScreen = () => (
  <main className="flex min-h-screen items-center justify-center bg-[#f4f4f4]">
    <div className="flex items-center gap-3 border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
      <span className="text-sm font-semibold text-slate-600">Preparando REVVO CRM...</span>
    </div>
  </main>
);

const LoginRoute = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate replace to={getFromPath(location.search)} />;
  }

  return <Login loading={isLoadingAuth} />;
};

const CrmRoutes = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();
  useCrmRealtime(isAuthenticated && !isLoadingAuth);

  if (isLoadingAuth) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    const from = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate replace to={`/entrar?from=${from}`} />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate replace to="/leads" />} />
        <Route path="/atividades" element={<Eventos />} />
        <Route path="/atendimentos" element={<Navigate replace to="/atividades" />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/configuracoes/distribuicao" element={<ConfiguracaoDistribuicao />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <Routes>
            <Route path="/entrar" element={<LoginRoute />} />
            <Route path="/login" element={<Navigate replace to="/entrar" />} />
            <Route path="*" element={<CrmRoutes />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
