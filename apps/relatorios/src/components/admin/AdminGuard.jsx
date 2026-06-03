import React from 'react';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

import { canReportsFunction } from '@/api/dataClient';

export default function AdminGuard({ user, module, requiredPermission = 'ver', children }) {
  const canAccess =
    user?.role === 'admin' ||
    (user?.role === 'manager' && module && canReportsFunction(user?.reports_permissions, module, requiredPermission));

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#f2f2f2' }}>
        <div className="text-center bg-white p-10" style={{ borderLeft: '4px solid #E30613' }}>
          <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: '#E30613' }} />
          <h2 className="text-xl font-black uppercase tracking-wider mb-2">Acesso Restrito</h2>
          <p className="text-sm mb-6" style={{ color: '#888' }}>Voce nao possui permissao para acessar esta area.</p>
          <Link
            to="/"
            className="inline-block px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white"
            style={{ background: '#E30613' }}
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
