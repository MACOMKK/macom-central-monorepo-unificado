import { lazy, Suspense } from 'react';
import { BrandLoader, Spinner, Toaster } from '@macom/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import PageNotFound from '@/lib/PageNotFound';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Login = lazy(() => import('@/pages/Login'));
const ReportViewer = lazy(() => import('@/pages/ReportViewer'));
const SetPassword = lazy(() => import('@/pages/SetPassword'));
const UserPanel = lazy(() => import('@/pages/UserPanel'));
const ManagePermissions = lazy(() => import('@/pages/admin/ManagePermissions'));
const ManageReports = lazy(() => import('@/pages/admin/ManageReports'));
const ManageUnits = lazy(() => import('@/pages/admin/ManageUnits'));
const Settings = lazy(() => import('@/pages/admin/Settings'));
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs'));

const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <Spinner size="lg" className="text-primary" />
  </div>
);

const PUBLIC_PATHS = new Set(['/entrar', '/definir-senha', '/login', '/set-password']);

const getFromPath = (search) => {
  const params = new URLSearchParams(search);
  const from = params.get('from');
  if (!from) return '/';

  try {
    const decoded = decodeURIComponent(from);
    return decoded.startsWith('/') ? decoded : '/';
  } catch {
    return '/';
  }
};

const LoginRoute = () => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const location = useLocation();
  const isLoading = isLoadingAuth || isLoadingPublicSettings;

  if (!isLoading && isAuthenticated) {
    return <Navigate replace to={getFromPath(location.search)} />;
  }

  return <Login loading={isLoading} />;
};

const PublicRoutes = () => (
  <Routes>
    <Route path="/entrar" element={<LoginRoute />} />
    <Route path="/definir-senha" element={<SetPassword />} />
    <Route path="/login" element={<Navigate replace to="/entrar" />} />
    <Route path="/set-password" element={<Navigate replace to="/definir-senha" />} />
    <Route path="*" element={<Navigate replace to="/entrar" />} />
  </Routes>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();
  const location = useLocation();
  const isPublicPath = PUBLIC_PATHS.has(location.pathname);

  if ((isLoadingPublicSettings || isLoadingAuth) && isPublicPath) {
    return <PublicRoutes />;
  }

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <BrandLoader />;
  }

  if (authError) {
    if (authError.type === 'config') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-xl w-full rounded border border-slate-200 bg-white p-6">
            <h1 className="mb-2 text-lg font-bold">Configuracao pendente do Supabase</h1>
            <p className="mb-4 text-sm text-slate-700">
              Defina no <code>.env.local</code> da raiz do monorepo as variaveis abaixo e reinicie o{' '}
              <code>npm run dev:relatorios</code>.
            </p>
            <pre className="overflow-auto rounded bg-slate-100 p-3 text-xs">
{`VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON`}
            </pre>
          </div>
        </div>
      );
    }

    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  return (
    <Routes>
      <Route path="/entrar" element={<LoginRoute />} />
      <Route path="/definir-senha" element={<SetPassword />} />
      <Route path="/login" element={<Navigate replace to="/entrar" />} />
      <Route path="/set-password" element={<Navigate replace to="/definir-senha" />} />
      {!isAuthenticated ? (
        <Route path="*" element={<Navigate replace to="/entrar" />} />
      ) : (
        <>
          <Route path="/painel" element={<UserPanel />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/relatorio/:id" element={<ReportViewer />} />
            <Route path="/relatorios" element={<ManageReports />} />
            <Route path="/unidades" element={<ManageUnits />} />
            <Route path="/permissoes" element={<ManagePermissions />} />
            <Route path="/acessos" element={<Settings />} />
            <Route path="/logs" element={<AuditLogs />} />
            <Route path="/report/:id" element={<ReportViewer />} />
            <Route path="/admin/relatorios" element={<Navigate replace to="/relatorios" />} />
            <Route path="/admin/unidades" element={<Navigate replace to="/unidades" />} />
            <Route path="/admin/permissoes" element={<Navigate replace to="/permissoes" />} />
            <Route path="/admin/acessos" element={<Navigate replace to="/acessos" />} />
            <Route path="/admin/logs" element={<Navigate replace to="/logs" />} />
            <Route path="/admin/reports" element={<Navigate replace to="/relatorios" />} />
            <Route path="/admin/units" element={<Navigate replace to="/unidades" />} />
            <Route path="/admin/permissions" element={<Navigate replace to="/permissoes" />} />
            <Route path="/admin/settings" element={<Navigate replace to="/acessos" />} />
            <Route path="/admin/audit" element={<Navigate replace to="/logs" />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </>
      )}
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route
              path="/entrar"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <LoginRoute />
                </Suspense>
              }
            />
            <Route
              path="/definir-senha"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <SetPassword />
                </Suspense>
              }
            />
            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
