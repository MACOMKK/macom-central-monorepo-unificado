import { BrandLoader, Toaster } from '@macom/ui';
import React, { lazy } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { canViewModule } from '@/lib/navigation';
import PasswordChangeForm from '@/components/auth/PasswordChangeForm';
import TemporaryEmailChangeForm from '@/components/auth/TemporaryEmailChangeForm';

import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Announcements = lazy(() => import('./pages/Announcements'));
const QuickLinks = lazy(() => import('./pages/QuickLinks'));
const Employees = lazy(() => import('./pages/Employees'));
const Documents = lazy(() => import('./pages/Documents'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Feedback = lazy(() => import('./pages/Feedback'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const PlatformGuide = lazy(() => import('./pages/PlatformGuide'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));

const ProtectedShell = () => {
  const { isLoadingAuth, isAuthenticated, mustChangeEmail, mustChangePassword } = useAuth();

  if (isLoadingAuth) {
    return <BrandLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangeEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <TemporaryEmailChangeForm required />
      </div>
    );
  }

  if (mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <PasswordChangeForm required />
      </div>
    );
  }

  return <Outlet />;
};

function AccessDenied() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-6">
      <div className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldCheck className="mx-auto mb-4 h-11 w-11 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Acesso restrito</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Seu usuario nao possui permissao para visualizar esta area.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="mt-6 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Voltar para Home
        </button>
      </div>
    </div>
  );
}

function ModuleRoute({ module, children }) {
  const { user } = useAuth();

  if (!canViewModule(module, user)) {
    return <AccessDenied />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedShell />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/avisos" element={<ModuleRoute module="avisos"><Announcements /></ModuleRoute>} />
                <Route path="/links" element={<ModuleRoute module="links"><QuickLinks /></ModuleRoute>} />
                <Route path="/colaboradores" element={<ModuleRoute module="colaboradores"><Employees /></ModuleRoute>} />
                <Route path="/documentos" element={<ModuleRoute module="documentos"><Documents /></ModuleRoute>} />
                <Route path="/calendario" element={<ModuleRoute module="calendario"><Calendar /></ModuleRoute>} />
                <Route path="/permissoes" element={<Navigate to="/configuracoes" replace />} />
                <Route path="/configuracoes" element={<Settings />} />
                <Route path="/perfil" element={<Profile />} />
                <Route path="/guia" element={<PlatformGuide />} />
                <Route path="/feedback" element={<ModuleRoute module="feedback"><Feedback /></ModuleRoute>} />
                <Route path="/conhecimento" element={<ModuleRoute module="conhecimento"><KnowledgeBase /></ModuleRoute>} />
              </Route>
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App

