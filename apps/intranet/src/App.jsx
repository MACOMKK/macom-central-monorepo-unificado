import { Toaster } from '@macom/ui';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Announcements from './pages/Announcements';
import QuickLinks from './pages/QuickLinks';
import Employees from './pages/Employees';
import Documents from './pages/Documents';
import Calendar from './pages/Calendar';
import Permissions from './pages/Permissions';
import Feedback from './pages/Feedback';
import KnowledgeBase from './pages/KnowledgeBase';
import Login from './pages/Login';
import PlatformGuide from './pages/PlatformGuide';

const MACOM_LOGO_URL = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';

const FullScreenLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <img src={MACOM_LOGO_URL} alt="MACOM" className="h-10 w-10 object-contain" />
      </div>
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
    </div>
  </div>
);

const ProtectedShell = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

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
                <Route path="/avisos" element={<Announcements />} />
                <Route path="/links" element={<QuickLinks />} />
                <Route path="/colaboradores" element={<Employees />} />
                <Route path="/documentos" element={<Documents />} />
                <Route path="/calendario" element={<Calendar />} />
                <Route path="/permissoes" element={<Permissions />} />
                <Route path="/guia" element={<PlatformGuide />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/conhecimento" element={<KnowledgeBase />} />
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

