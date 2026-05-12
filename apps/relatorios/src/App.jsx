import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import PageNotFound from '@/lib/PageNotFound';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import ReportViewer from '@/pages/ReportViewer';
import SetPassword from '@/pages/SetPassword';
import UserPanel from '@/pages/UserPanel';
import ManagePermissions from '@/pages/admin/ManagePermissions';
import ManageReports from '@/pages/admin/ManageReports';
import ManageUnits from '@/pages/admin/ManageUnits';
import Settings from '@/pages/admin/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
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
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      {!isAuthenticated ? (
        <Route path="*" element={<Navigate replace to="/login" />} />
      ) : (
        <>
          <Route path="/painel" element={<UserPanel />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/report/:id" element={<ReportViewer />} />
            <Route path="/admin/reports" element={<ManageReports />} />
            <Route path="/admin/units" element={<ManageUnits />} />
            <Route path="/admin/permissions" element={<ManagePermissions />} />
            <Route path="/admin/settings" element={<Settings />} />
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
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
