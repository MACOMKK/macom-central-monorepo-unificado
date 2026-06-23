import { useEffect, useState } from 'react';
import { appClient } from '@/api/client';

// Returns { role, canView, canEdit, isLoading }
// Admin always has full access
// Otherwise checks UserPermission entity

export function usePermissions(module) {
  const [state, setState] = useState({ role: null, canView: false, canEdit: false, isLoading: true });

  useEffect(() => {
    let active = true;

    async function load() {
      const user = await appClient.auth.me().catch(() => null);
      if (!active) return;

      if (!user) {
        setState({ role: null, canView: false, canEdit: false, isLoading: false });
        return;
      }

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

    return () => {
      active = false;
    };
  }, [module]);

  return state;
}

export function clearPermissionsCache() {
  // Kept for older imports; permissions are loaded fresh per mount.
}

