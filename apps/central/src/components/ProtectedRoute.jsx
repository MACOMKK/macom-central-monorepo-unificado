import { Navigate, Outlet } from 'react-router-dom';
import { PageLoader } from '@macom/ui';

import { useAuth } from '@/lib/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader label="Preparando sessao..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
