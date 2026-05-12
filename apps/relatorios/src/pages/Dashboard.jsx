import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { dataClient } from '@/api/dataClient';
import { BarChart3, Building2, Search, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ReportCard from '@/components/dashboard/ReportCard';

const categoryLabels = {
  gerencial: 'Gerencial',
  financeiro: 'Financeiro',
  operacional: 'Operacional',
  comercial: 'Comercial',
  rh: 'RH',
  outros: 'Outros',
};

export default function Dashboard() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const isAdmin = user?.role === 'admin';

  const { data: allReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['reports'],
    queryFn: () => dataClient.entities.Report.filter({ active: true }),
  });

  const { data: permissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ['permissions', user?.email],
    queryFn: () => dataClient.entities.ReportPermission.filter({ user_email: user?.email }),
    enabled: !!user?.email && !isAdmin,
  });

  const allowedReportIds = permissions.map(p => p.report_id);
  const reports = isAdmin ? allReports : allReports.filter(r => allowedReportIds.includes(r.id));

  const filteredReports = reports.filter(r => {
    const matchSearch =
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.unit_name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === 'all' || r.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const categories = ['all', ...new Set(reports.map(r => r.category).filter(Boolean))];
  const isLoading = loadingReports || (!isAdmin && loadingPermissions);
  const unitCount = new Set(reports.map(r => r.unit_name).filter(Boolean)).size;

  return (
    <div className="min-h-screen" style={{ background: '#f2f2f2' }}>
      {/* Hero Header — estilo MACOM */}
      <div className="relative overflow-hidden" style={{ background: '#141414', minHeight: 180 }}>
        {/* Diagonal accent */}
        <div
          className="absolute right-0 top-0 h-full"
          style={{
            width: '35%',
            background: '#E30613',
            clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)',
            opacity: 0.12,
          }}
        />
        <div className="relative px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#E30613' }}>
                Portal de Relatórios
              </p>
              <h1 className="text-2xl lg:text-4xl font-black text-white uppercase tracking-tight leading-none">
                Olá, {user?.full_name?.split(' ')[0] || 'Usuário'}
              </h1>
              <p className="mt-2 text-xs sm:text-sm" style={{ color: '#888' }}>
                {isAdmin ? 'Acesso completo a todos os relatórios' : `${reports.length} relatório(s) disponíveis para você`}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-sm sm:max-w-lg">
            {[
              { icon: BarChart3, label: 'Relatórios', value: reports.length },
              { icon: Building2, label: 'Unidades', value: unitCount },
              { icon: TrendingUp, label: 'Categorias', value: categories.length - 1 },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-3">
                <div style={{ width: 2, height: 36, background: '#E30613' }} />
                <div>
                  <p className="text-2xl font-black text-white leading-none">{stat.value}</p>
                  <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: '#666' }}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-6 lg:px-10 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white border-b" style={{ borderColor: '#e5e5e5' }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#999' }} />
          <Input
            placeholder="Buscar relatório..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 border-0 bg-gray-50 focus-visible:ring-1"
            style={{ borderRadius: 2 }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
              style={{
                background: activeCategory === cat ? '#E30613' : 'transparent',
                color: activeCategory === cat ? '#fff' : '#555',
                border: activeCategory === cat ? '2px solid #E30613' : '2px solid #ddd',
                borderRadius: 2,
              }}
            >
              {cat === 'all' ? 'Todos' : categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="px-4 sm:px-6 lg:px-10 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-white p-5" style={{ borderLeft: '4px solid #E30613' }}>
                <Skeleton className="h-4 w-3/4 mb-3" />
                <Skeleton className="h-3 w-1/2 mb-5" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center" style={{ background: '#E30613' }}>
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-wider text-foreground mb-1">
              Nenhum relatório encontrado
            </h3>
            <p className="text-sm" style={{ color: '#888' }}>
              {search ? 'Tente outro termo de busca.' : 'Você ainda não tem relatórios atribuídos.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredReports.map(report => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

