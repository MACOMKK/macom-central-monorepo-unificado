import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataClient } from '@/api/dataClient';
import { BarChart3, Search, LogOut, Building2, ArrowRight } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const MACOM_LOGO_URL = 'https://svlhklfzwtcvaospmhxy.supabase.co/storage/v1/object/public/Imagens%20macom/image_macom.png';

const categoryLabels = {
  gerencial: 'Gerencial', financeiro: 'Financeiro', operacional: 'Operacional',
  comercial: 'Comercial', rh: 'RH', outros: 'Outros',
};

export default function UserPanel() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const { data: allReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['reports-user-panel'],
    queryFn: () => dataClient.entities.Report.filter({ active: true }),
  });

  const { data: permissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions-user-panel', user?.email],
    queryFn: () => dataClient.entities.ReportPermission.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const allowedIds = permissions.map(p => p.report_id);
  const reports = allReports.filter(r => allowedIds.includes(r.id));

  const filtered = reports.filter(r =>
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.unit_name?.toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = loadingReports || loadingPerms;

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
    <div className="min-h-screen flex flex-col" style={{ background: '#f2f2f2' }}>
      <header style={{ background: '#141414', borderBottom: '3px solid #E30613' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={MACOM_LOGO_URL} alt="MACOM" className="w-10 h-9 object-cover" />
            <div>
              <span className="text-white font-black text-sm tracking-widest uppercase">MACOM</span>
              <p className="text-[10px] tracking-wider uppercase leading-none" style={{ color: '#E30613' }}>Portal BI</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setPasswordOpen(true)}
              className="hidden sm:inline text-[10px] font-black uppercase tracking-widest"
              style={{ color: '#fff' }}
            >
              Alterar Minha Senha
            </button>

            {user && (
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="w-7 h-7 flex items-center justify-center text-xs font-black text-white" style={{ background: '#E30613' }}>
                  {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="text-xs font-bold text-white">{user.full_name || user.email}</span>
              </div>
            )}
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
              style={{ color: '#666' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#E30613'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#666'; }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#E30613' }}>
              Seus Relatorios
            </p>
            <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: '#141414' }}>
              Painel do Usuario
            </h1>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#999' }} />
            <Input
              placeholder="Buscar relatorio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white border-0 focus-visible:ring-1"
              style={{ borderRadius: 2 }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white p-5" style={{ borderLeft: '4px solid #E30613' }}>
                <Skeleton className="h-4 w-3/4 mb-3" />
                <Skeleton className="h-3 w-1/2 mb-5" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center" style={{ background: '#E30613' }}>
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-wider mb-1" style={{ color: '#141414' }}>
              {search ? 'Nenhum resultado' : 'Sem relatorios disponiveis'}
            </h3>
            <p className="text-sm" style={{ color: '#888' }}>
              {search ? 'Tente outro termo.' : 'Voce ainda nao tem relatorios atribuidos. Contate o administrador.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(report => (
              <Link
                key={report.id}
                to={`/report/${report.id}`}
                className="group block bg-white relative overflow-hidden transition-all duration-200"
                style={{ borderLeft: '4px solid #E30613', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(227,6,19,0.12)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="p-5">
                  {report.category && (
                    <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 mb-3" style={{ background: '#E30613', color: '#fff' }}>
                      {categoryLabels[report.category] || report.category}
                    </span>
                  )}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center" style={{ background: '#f2f2f2' }}>
                      <BarChart3 className="w-4 h-4" style={{ color: '#E30613' }} />
                    </div>
                    <h3 className="font-black text-sm uppercase tracking-wide leading-snug group-hover:text-red-600 transition-colors" style={{ color: '#141414' }}>
                      {report.title}
                    </h3>
                  </div>
                  {report.description && (
                    <p className="text-xs line-clamp-2 mb-4" style={{ color: '#888' }}>{report.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #f0f0f0' }}>
                    {report.unit_name ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#999' }}>
                        <Building2 className="w-3 h-3" />{report.unit_name}
                      </span>
                    ) : <span />}
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#E30613' }}>
                      Ver <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-[10px] uppercase tracking-widest font-bold" style={{ color: '#bbb' }}>
        MACOM (c) {new Date().getFullYear()} - Portal BI
      </footer>

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
    </div>
  );
}
