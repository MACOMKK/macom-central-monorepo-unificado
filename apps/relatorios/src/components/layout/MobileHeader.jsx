import React from 'react';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const MACOM_LOGO_URL = 'https://svlhklfzwtcvaospmhxy.supabase.co/storage/v1/object/public/Imagens%20macom/image_macom.png';

export default function MobileHeader({ user, onMenuOpen }) {
  const { logout } = useAuth();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14 md:hidden"
      style={{ background: '#141414', borderBottom: '2px solid #E30613' }}
    >
      <button
        onClick={onMenuOpen}
        className="p-1.5 transition-colors"
        style={{ color: '#aaa' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; }}
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2">
        <img src={MACOM_LOGO_URL} alt="MACOM" className="w-8 h-7 object-cover" />
        <span className="text-white font-black text-sm tracking-widest uppercase">MACOM</span>
      </div>

      <button
        onClick={() => logout()}
        className="p-1.5 transition-colors"
        style={{ color: '#666' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#E30613'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#666'; }}
      >
        <LogOut className="w-5 h-5" />
      </button>
    </header>
  );
}
