import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, Building2, FileText, Shield, LogOut, ChevronLeft, ChevronRight, MessageCircle, Mail } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/api/supabaseClient';

const MACOM_LOGO_URL = 'https://svlhklfzwtcvaospmhxy.supabase.co/storage/v1/object/public/Imagens%20macom/image_macom.png';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
  { path: '/admin/reports', icon: FileText, label: 'Relatorios', adminOnly: true },
  { path: '/admin/units', icon: Building2, label: 'Unidades', adminOnly: true },
  { path: '/admin/permissions', icon: Shield, label: 'Permissoes', adminOnly: true },
  { path: '/admin/settings', icon: Settings, label: 'Configuracoes', adminOnly: true },
];

export default function Sidebar({ user, collapsed, onToggle, onClose }) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);
  const isAdmin = user?.role === 'admin';

  const filteredItems = navItems.filter(item => !item.adminOnly || isAdmin);
  const supportItems = [
    {
      href: 'https://wa.me/5591983927903',
      icon: MessageCircle,
      label: 'WhatsApp',
      value: '(91) 98392-7903'
    },
    {
      href: 'mailto:kevinsoares@jcmempresas.com.br',
      icon: Mail,
      label: 'Email',
      value: 'kevinsoares@jcmempresas.com.br'
    }
  ];

  const handleUpdateMyPassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: 'Senha invalida', description: 'Use pelo menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Senha invalida', description: 'As senhas nao conferem.' });
      return;
    }

    setIsSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSavingPassword(false);

    if (error) {
      toast({ title: 'Falha ao alterar senha', description: error.message });
      return;
    }

    toast({ title: 'Senha alterada com sucesso!' });
    setPasswordOpen(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`flex flex-col h-full transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}
        style={{ background: '#141414', borderRight: '1px solid #222' }}
      >
        <div className={`flex items-center gap-3 h-16 border-b px-4 ${collapsed ? 'justify-center' : ''}`} style={{ borderColor: '#222' }}>
          <img src={MACOM_LOGO_URL} alt="MACOM" className="w-10 h-9 object-cover flex-shrink-0" />
          {!collapsed && (
            <div>
              <span className="text-white font-black text-base tracking-widest uppercase">MACOM</span>
              <p className="text-[10px] tracking-wider uppercase" style={{ color: '#E30613' }}>Portal BI</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {isAdmin && !collapsed && (
            <p className="text-[9px] uppercase tracking-widest font-bold px-3 mb-3 mt-1" style={{ color: '#555' }}>
              Navegacao
            </p>
          )}
          {filteredItems.map(item => {
            const isActive = location.pathname === item.path;
            const linkContent = (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold uppercase tracking-wider transition-all duration-150 ${
                  collapsed ? 'justify-center' : ''
                }`}
                style={{
                  background: isActive ? '#E30613' : 'transparent',
                  color: isActive ? '#fff' : '#aaa',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.background = '#222';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#aaa';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="text-xs">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-bold uppercase tracking-wider text-xs">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return linkContent;
          })}
        </nav>

        <div className="border-t p-3 space-y-2" style={{ borderColor: '#222' }}>
          {!collapsed && user && (
            <button
              onClick={() => setPasswordOpen(true)}
              className="w-full text-left flex items-center gap-2.5 px-2 py-2 rounded-sm transition-colors"
              onMouseEnter={e => { e.currentTarget.style.background = '#1b1b1b'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div
                className="w-8 h-8 flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                style={{ background: '#E30613' }}
              >
                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate text-white">{user.full_name || 'Usuario'}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#E30613' }}>{user.role || 'user'}</p>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: '#777' }}>Alterar senha</p>
              </div>
            </button>
          )}

          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center py-2 transition-colors"
            style={{ color: '#555' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {!collapsed && (
            <div className="px-2 py-1">
              <p className="text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: '#555' }}>
                Suporte
              </p>
              <div className="space-y-0.5">
                {supportItems.map(item => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-1 py-1 text-[10px] font-medium transition-colors"
                    style={{ color: '#aaa' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; }}
                  >
                    <item.icon className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{item.value}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {collapsed &&
            supportItems.map(item => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center py-2 transition-colors"
                    style={{ color: '#555' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
                  >
                    <item.icon className="w-4 h-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold uppercase tracking-wider text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ))}

          {collapsed && user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setPasswordOpen(true)}
                  className="w-full flex items-center justify-center py-2 transition-colors"
                  style={{ color: '#555' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
                >
                  <div
                    className="w-7 h-7 flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: '#E30613' }}
                  >
                    {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-bold uppercase tracking-wider text-xs">
                Alterar senha
              </TooltipContent>
            </Tooltip>
          )}

          {!collapsed && (
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
              style={{ color: '#555' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#E30613'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          )}
        </div>

        <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-wider text-sm">Alterar Minha Senha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest">Nova senha</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimo 8 caracteres"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest">Confirmar senha</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setPasswordOpen(false)}
                  className="px-5 py-2.5 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <Button onClick={handleUpdateMyPassword} disabled={isSavingPassword || !newPassword || !confirmPassword}>
                  {isSavingPassword ? 'Salvando...' : 'Salvar senha'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </aside>
    </TooltipProvider>
  );
}
