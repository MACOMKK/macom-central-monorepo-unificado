import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, MessageCircle, Mail } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { MACOM_LOGO_URL } from '@/config/branding';
import { getOverflowNavItems } from '@/lib/navigation';
import PasswordChangeDialog from './PasswordChangeDialog';

const supportItems = [
  { href: 'https://wa.me/5591983927903', icon: MessageCircle, label: 'WhatsApp', value: '(91) 98392-7903' },
  { href: 'mailto:kevinsoares@jcmempresas.com.br', icon: Mail, label: 'Email', value: 'kevinsoares@jcmempresas.com.br' },
];

export default function MobileNav({ open, onClose }) {
  const location = useLocation();
  const { user } = useAuth();
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const overflowItems = getOverflowNavItems(user);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} />}

      <div
        className="fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[320px] flex-col transition-transform duration-300 md:hidden"
        style={{ background: '#141414', transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: '#222' }}>
          <div className="flex items-center gap-2.5">
            <img src={MACOM_LOGO_URL} alt="MACOM" className="w-8 h-7 object-cover" />
            <span className="text-white font-black text-sm tracking-widest uppercase">MACOM</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: '#aaa' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {overflowItems.length > 0 && (
          <nav className="p-3 space-y-0.5 border-b overflow-y-auto" style={{ borderColor: '#222' }}>
            {overflowItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors"
                  style={{
                    background: isActive ? '#E30613' : 'transparent',
                    color: isActive ? '#fff' : '#aaa',
                  }}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        <div className="p-3 space-y-1">
          {user && (
            <button
              onClick={() => setPasswordOpen(true)}
              className="w-full text-left flex items-center gap-2.5 px-2 py-2 rounded-sm transition-colors"
            >
              <div
                className="w-8 h-8 flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                style={{ background: '#E30613' }}
              >
                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate text-white">{user.full_name || 'Usuario'}</p>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: '#777' }}>Alterar senha</p>
              </div>
            </button>
          )}

          <p className="px-2 pt-3 text-[9px] uppercase tracking-widest font-bold" style={{ color: '#555' }}>
            Suporte
          </p>
          <div className="space-y-0.5">
            {supportItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-medium"
                style={{ color: '#aaa' }}
              >
                <item.icon className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{item.value}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <PasswordChangeDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}
