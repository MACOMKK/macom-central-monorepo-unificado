import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { BarChart3, Building2, Search, TrendingUp } from 'lucide-react';

import { dataClient } from '@/api/dataClient';
import ReportCard from '@/components/dashboard/ReportCard';
import { Input, Skeleton } from '@macom/ui';

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
    queryKey: ['reports', user?.id, user?.role],
    queryFn: () => dataClient.entities.Report.filter({ active: true }),
    enabled: !!user?.id,
  });

  const reports = allReports;
  const isLoading = loadingReports;
  const unitCount = new Set(reports.map((report) => report.unit_name).filter(Boolean)).size;
  const categories = ['all', ...new Set(reports.map((report) => report.category).filter(Boolean))];

  const filteredReports = reports.filter((report) => {
    const matchSearch =
      report.title?.toLowerCase().includes(search.toLowerCase()) ||
      report.unit_name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === 'all' || report.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen" style={{ background: '#f2f2f2' }}>
      <div className="relative overflow-hidden" style={{ background: '#141414', minHeight: 180 }}>
        <div
          className="absolute right-0 top-0 h-full"
          style={{
            width: '35%',
            background: '#E30613',
            clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)',
            opacity: 0.12,
          }}
        />

        <div className="relative px-4 py-8 sm:px-6 lg:px-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#E30613' }}>
                Portal de Relatorios
              </p>
              <h1 className="text-2xl font-black uppercase leading-none tracking-tight text-white lg:text-4xl">
                Ola, {user?.full_name?.split(' ')[0] || 'Usuario'}
              </h1>
              <p className="mt-2 text-xs sm:text-sm" style={{ color: '#888' }}>
                {isAdmin
                  ? 'Acesso completo a todos os relatorios'
                  : `${reports.length} relatorio(s) disponiveis para voce`}
              </p>
            </div>
          </div>

          <div className="mt-6 grid max-w-sm grid-cols-3 gap-3 sm:max-w-lg">
            {[
              { icon: BarChart3, label: 'Relatorios', value: reports.length },
              { icon: Building2, label: 'Unidades', value: unitCount },
              { icon: TrendingUp, label: 'Categorias', value: categories.length - 1 },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div style={{ width: 2, height: 36, background: '#E30613' }} />
                <div>
                  <p className="text-2xl font-black leading-none text-white">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest" style={{ color: '#666' }}>
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex flex-col items-start gap-3 border-b bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-6 lg:px-10"
        style={{ borderColor: '#e5e5e5' }}
      >
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#999' }} />
          <Input
            placeholder="Buscar relatorio..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="border-0 bg-gray-50 pl-9 focus-visible:ring-1"
            style={{ borderRadius: 2 }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
              style={{
                background: activeCategory === category ? '#E30613' : 'transparent',
                color: activeCategory === category ? '#fff' : '#555',
                border: activeCategory === category ? '2px solid #E30613' : '2px solid #ddd',
                borderRadius: 2,
              }}
            >
              {category === 'all' ? 'Todos' : categoryLabels[category] || category}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-10">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white p-5" style={{ borderLeft: '4px solid #E30613' }}>
                <Skeleton className="mb-3 h-4 w-3/4" />
                <Skeleton className="mb-5 h-3 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-24 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center" style={{ background: '#E30613' }}>
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h3 className="mb-1 text-lg font-black uppercase tracking-wider text-foreground">
              Nenhum relatorio encontrado
            </h3>
            <p className="text-sm" style={{ color: '#888' }}>
              {search ? 'Tente outro termo de busca.' : 'Voce ainda nao tem relatorios atribuidos.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
