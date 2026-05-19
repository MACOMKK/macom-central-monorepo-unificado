import { useEffect, useState } from 'react';
import { appClient } from '@/api/client';

// Returns { role, canView, canEdit, isLoading }
// Admin always has full access
// Otherwise checks UserPermission entity

let cachedUser = null;

export function usePermissions(module) {
  const [state, setState] = useState({ role: null, canView: false, canEdit: false, isLoading: true });

  useEffect(() => {
    async function load() {
      const user = cachedUser || await appClient.auth.me().catch(() => null);
      if (!user) { setState({ role: null, canView: false, canEdit: false, isLoading: false }); return; }
      cachedUser = user;

      if (user.role === 'admin') {
        setState({ role: 'admin', canView: true, canEdit: true, isLoading: false });
        return;
      }

      if (!module) {
        setState({ role: user.role, canView: true, canEdit: false, isLoading: false });
        return;
      }

      const level = user.permissions?.[module] ?? 'view';
      setState({
        role: user.role,
        canView: level === 'view' || level === 'edit',
        canEdit: level === 'edit',
        isLoading: false,
      });
    }
    load();
  }, [module]);

  return state;
}

// Clears cache on logout/login
export function clearPermissionsCache() {
  cachedUser = null;
}

