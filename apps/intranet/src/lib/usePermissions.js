import { useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';

// Returns { role, canView, canEdit, isLoading }
// Admin always has full access
// Otherwise checks UserPermission entity
//
// Reuses the user already loaded by AuthContext instead of calling auth.me()
// again — a separate fetch per module/page was firing extra 'me' calls and
// creating duplicate access-log entries on the backend (each successful
// 'me' call registers an access log).

export function usePermissions(module) {
  const { user, isLoadingAuth, authChecked } = useAuth();

  return useMemo(() => {
    const isLoading = !authChecked && isLoadingAuth;

    if (isLoading) {
      return { role: null, canView: false, canEdit: false, isLoading: true };
    }

    if (!user) {
      return { role: null, canView: false, canEdit: false, isLoading: false };
    }

    if (user.role === 'admin') {
      return { role: 'admin', canView: true, canEdit: true, isLoading: false };
    }

    if (!module) {
      return { role: user.role, canView: true, canEdit: false, isLoading: false };
    }

    const level = user.permissions?.[module] ?? 'view';
    return {
      role: user.role,
      canView: level === 'view' || level === 'edit',
      canEdit: level === 'edit',
      isLoading: false,
    };
  }, [user, module, isLoadingAuth, authChecked]);
}

export function clearPermissionsCache() {
  // Kept for older imports; permissions are loaded fresh per mount.
}

