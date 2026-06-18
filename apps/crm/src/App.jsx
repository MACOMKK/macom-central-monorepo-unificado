import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import ReportViewer from '@/pages/ReportViewer';
import ManageReports from '@/pages/admin/ManageReports';
import ManageUnits from '@/pages/admin/ManageUnits';
import ManagePermissions from '@/pages/admin/ManagePermissions';
import Settings from '@/pages/admin/Settings';
import UserPanel from '@/pages/UserPanel';
import Login from '@/pages/Login';
import SetPassword from '@/pages/SetPassword';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'config') {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
          <div className="max-w-xl w-full bg-white border border-slate-200 p-6 rounded">
            <h1 className="text-lg font-bold mb-2">Configuração pendente do Supabase</h1>
            <p className="text-sm text-slate-700 mb-4">
              Crie o arquivo <code>.env.local</code> com as variáveis abaixo e reinicie o <code>npm run dev</code>.
            </p>
            <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto">
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
        <Route path="*" element={<Navigate to="/login" replace />} />
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
  )
}

export default App
