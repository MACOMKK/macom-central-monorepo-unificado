import { Toaster } from '@macom/ui';
import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
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

const FullScreenLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
        <span className="text-white font-bold text-lg">M</span>
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

const DebugLifecycle = () => {
  const location = useLocation();

  useEffect(() => {
    const onVisibilityChange = () => {
      console.log('[intranet] visibilitychange', {
        visibilityState: document.visibilityState,
        timestamp: new Date().toISOString(),
      });
    };

    const onFocus = () => {
      console.log('[intranet] window focus', {
        timestamp: new Date().toISOString(),
      });
    };

    const onBlur = () => {
      console.log('[intranet] window blur', {
        timestamp: new Date().toISOString(),
      });
    };

    const onPageShow = (event) => {
      console.log('[intranet] pageshow', {
        persisted: event.persisted,
        timestamp: new Date().toISOString(),
      });
    };

    const onPageHide = (event) => {
      console.log('[intranet] pagehide', {
        persisted: event.persisted,
        timestamp: new Date().toISOString(),
      });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  useEffect(() => {
    console.log('[intranet] route change', {
      pathname: location.pathname,
      search: location.search,
      timestamp: new Date().toISOString(),
    });
  }, [location.pathname, location.search]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <DebugLifecycle />
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

