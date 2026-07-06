import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, ProtectedRoute, useAuth } from '@macom/auth';
import { NotFoundPage } from '@macom/ui';

import ConsoleLayout from '@/components/ConsoleLayout';
import ConsoleDashboard from '@/pages/ConsoleDashboard';
import AccessLogOverview from '@/pages/AccessLogOverview';
import AuditOverview from '@/pages/AuditOverview';
import PlaceholderPage from '@/pages/PlaceholderPage';
import PlatformGuide from '@/pages/PlatformGuide';
import SystemAccessManagement from '@/pages/SystemAccessManagement';
import SystemPermissions from '@/pages/SystemPermissions';
import SystemsCatalog from '@/pages/SystemsCatalog';
import UsersOverview from '@/pages/UsersOverview';
import { queryClient } from '@/lib/query-client';
import Login from './Login';

function LoginRoute() {
  const { isAuthenticated, loading, login } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Login onSubmit={login} loading={loading} />;
}

export default function App() {
  return (
    <AuthProvider authFunctionName="plataforma-api" systemSlug="central">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<ConsoleLayout />}>
                <Route path="/" element={<ConsoleDashboard />} />
                <Route path="/sistemas" element={<SystemsCatalog />} />
                <Route path="/permissoes-sistemas" element={<SystemPermissions />} />
                <Route path="/acessos-sistemas" element={<SystemAccessManagement />} />
                <Route path="/usuarios" element={<UsersOverview />} />
                <Route path="/auditoria" element={<AuditOverview />} />
                <Route path="/logs-acesso" element={<AccessLogOverview />} />
                <Route path="/guia" element={<PlatformGuide />} />
                <Route
                  path="/configuracoes"
                  element={
                    <PlaceholderPage
                      title="Configuracoes"
                      description="Parametros globais do Console e integracoes compartilhadas."
                    />
                  }
                />
              </Route>
            </Route>
            <Route
              path="*"
              element={
                <NotFoundPage
                  title="Area nao encontrada"
                  message="Esta rota ainda nao existe no Console Macom."
                  homeLabel="Voltar para o Console"
                />
              }
            />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}
