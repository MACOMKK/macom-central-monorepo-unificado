import { Toaster } from '@macom/ui';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import MinhasSolicitacoes from '@/pages/MinhasSolicitacoes';
import Aprovacoes from '@/pages/Aprovacoes';
import Pagamentos from '@/pages/Pagamentos';
import Permissoes from '@/pages/Permissoes';
import ModuloEmBreve from '@/pages/ModuloEmBreve';

const getFromPath = (search) => {
  const params = new URLSearchParams(search);
  const from = params.get('from');
  if (!from) return '/solicitacoes';

  try {
    const decoded = decodeURIComponent(from);
    return decoded.startsWith('/') ? decoded : '/solicitacoes';
  } catch {
    return '/solicitacoes';
  }
};

const LoadingScreen = () => (
  <main className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      <span className="text-sm font-semibold text-muted-foreground">Preparando MACOM Servicos...</span>
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

const ServicosRoutes = () => {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const location = useLocation();

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
        <Route path="/" element={<Navigate replace to="/solicitacoes" />} />
        <Route path="/solicitacoes" element={<MinhasSolicitacoes />} />
        {user?.isAprovador && <Route path="/aprovacoes" element={<Aprovacoes />} />}
        {user?.isFinanceiro && <Route path="/pagamentos" element={<Pagamentos />} />}
        {user?.system_access_level === 'admin' && <Route path="/permissoes" element={<Permissoes />} />}
        <Route
          path="/atendimento"
          element={<ModuloEmBreve titulo="Atendimento" descricao="Recepcao de clientes, abertura de OS, agendamento e historico de veiculos." />}
        />
        <Route
          path="/oficina"
          element={<ModuloEmBreve titulo="Oficina" descricao="Servicos executados, mecanicos responsaveis, checklist e controle de pecas." />}
        />
        <Route
          path="/estoque"
          element={<ModuloEmBreve titulo="Estoque" descricao="Pecas, pneus, oleos e entradas/saidas." />}
        />
        <Route
          path="/compras"
          element={<ModuloEmBreve titulo="Compras" descricao="Solicitacao de compra, aprovacao e pedidos para fornecedores." />}
        />
        <Route
          path="/rh"
          element={<ModuloEmBreve titulo="RH" descricao="Funcionarios, ferias e reembolsos." />}
        />
        <Route path="*" element={<Navigate replace to="/solicitacoes" />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/entrar" element={<LoginRoute />} />
          <Route path="/login" element={<Navigate replace to="/entrar" />} />
          <Route path="*" element={<ServicosRoutes />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
