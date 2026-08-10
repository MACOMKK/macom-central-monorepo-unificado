import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { NotFoundPage, Spinner, Toaster } from '@macom/ui';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { queryClient } from '@/lib/query-client';
import { useComunicacaoRealtime } from '@/hooks/useComunicacaoRealtime';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Chat from '@/pages/Chat';
import DirectMessage from '@/pages/DirectMessage';

const FullScreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Spinner size="lg" className="text-primary" />
  </div>
);

function ProtectedShell() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  useComunicacaoRealtime(isAuthenticated);

  if (isLoadingAuth) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/entrar" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/entrar" element={<Login />} />
            <Route element={<ProtectedShell />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/canais/geral" replace />} />
                <Route path="/canais/:slug" element={<Chat />} />
                <Route path="/dm/:conversaId" element={<DirectMessage />} />
              </Route>
            </Route>
            <Route
              path="*"
              element={<NotFoundPage title="Página não encontrada" message="Esta rota não existe na Comunicação MACOM." homeLabel="Voltar" />}
            />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
