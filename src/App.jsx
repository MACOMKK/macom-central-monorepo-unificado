import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Assets from '@/pages/Assets';
import Collaborators from '@/pages/Collaborators';
import Dashboard from '@/pages/Dashboard';
import Departments from '@/pages/Departments';
import Login from '@/pages/Login';
import { queryClientInstance } from '@/lib/query-client';
import Units from '@/pages/Units';

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
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/ativos" element={<Assets />} />
                <Route path="/colaboradores" element={<Collaborators />} />
                <Route path="/departamentos" element={<Departments />} />
                <Route path="/unidades" element={<Units />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}
