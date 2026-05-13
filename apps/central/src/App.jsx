import { lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { queryClientInstance } from '@/lib/query-client';

const Assets = lazy(() => import('@/pages/Assets'));
const Collaborators = lazy(() => import('@/pages/Collaborators'));
const Contacts = lazy(() => import('@/pages/Contacts'));
const CorporateLines = lazy(() => import('@/pages/CorporateLines'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Departments = lazy(() => import('@/pages/Departments'));
const Infrastructure = lazy(() => import('@/pages/Infrastructure'));
const Login = lazy(() => import('@/pages/Login'));
const SystemAccess = lazy(() => import('@/pages/SystemAccess'));
const TermsPossession = lazy(() => import('@/pages/TermsPossession'));
const Units = lazy(() => import('@/pages/Units'));

function RouteFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-sm">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#881337]/20 border-t-[#881337]" />
        <span className="text-sm text-slate-600">Carregando pagina...</span>
      </div>
    </main>
  );
}

function LoginRoute() {
  const { isAuthenticated, loading, login } = useAuth();

  if (loading) {
    return <Login onSubmit={login} loading defaultEmail="kevinkleymacom@gmail.com" />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Login onSubmit={login} loading={false} defaultEmail="kevinkleymacom@gmail.com" />;
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/ativos" element={<Assets />} />
                  <Route path="/colaboradores" element={<Collaborators />} />
                  <Route path="/contatos" element={<Contacts />} />
                  <Route path="/linhas-corporativas" element={<CorporateLines />} />
                  <Route path="/departamentos" element={<Departments />} />
                  <Route path="/unidades" element={<Units />} />
                  <Route path="/infraestrutura" element={<Infrastructure />} />
                  <Route path="/acessos-sistemas" element={<SystemAccess />} />
                  <Route path="/termos-posse" element={<TermsPossession />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}
