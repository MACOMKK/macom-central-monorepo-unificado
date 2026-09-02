import { Navigate, Outlet } from 'react-router-dom';
import { BrandLoader, PasswordChangeForm } from '@macom/ui';

import { useAuth } from './AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, loading, mustChangePassword, changePassword } = useAuth();

  if (loading) {
    return <BrandLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <PasswordChangeForm required onSubmit={changePassword} />
      </div>
    );
  }

  return <Outlet />;
}
