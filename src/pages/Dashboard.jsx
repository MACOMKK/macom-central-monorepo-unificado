import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, HardDrive, Laptop, MonitorCog, UsersRound, Wrench } from 'lucide-react';

import StatsCard from '@/components/dashboard/StatsCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { catalogApi } from '@/lib/catalogApi';

function polarToCartesian(cx, cy, radius, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

function DonutChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 80;
  const circumferenceGap = 4;
  const strokeWidth = 40;
  let currentAngle = 0;

  return (
    <div className="flex h-[250px] flex-col items-center justify-center">
      {total ? (
        <svg viewBox="0 0 240 240" className="h-[220px] w-[220px]">
          <circle
            cx="120"
            cy="120"
            r={radius + strokeWidth / 2}
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2"
          />
          <circle cx="120" cy="120" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="40" />
          {data.map((item) => {
            const sweep = (item.value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + Math.max(sweep - circumferenceGap, 0);
            currentAngle += sweep;

            if (item.value === 0) return null;

            return (
              <path
                key={item.label}
                d={describeArc(120, 120, radius, startAngle, endAngle)}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
              />
            );
          })}
          <circle cx="120" cy="120" r="60" fill="hsl(var(--card))" />
          <circle cx="120" cy="120" r="60" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
        </svg>
      ) : (
        <div className="py-16 text-center text-sm text-muted-foreground">Nenhum dado para exibir</div>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.label}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarChart({ data, maxValue }) {
  const chartMax = Math.max(maxValue, 1);

  if (!data.length) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Nenhum dado para exibir</div>;
  }

  return (
    <div className="flex h-[280px] flex-col justify-center gap-5">
      {data.map((item) => (
        <div key={item.label} className="grid grid-cols-[80px_1fr] items-center gap-4">
          <div className="truncate text-[11px] text-muted-foreground">{item.label}</div>
          <div className="relative h-10">
            <div className="absolute inset-0 grid grid-cols-4">
              {[0, 1, 2, 3].map((tick) => (
                <div key={tick} className="border-r border-dashed border-border" />
              ))}
            </div>
            <div
              className="relative h-10 rounded-r-md bg-[#e50914]"
              style={{ width: `${(item.value / chartMax) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <div className="ml-[96px] grid grid-cols-5 text-[11px] text-muted-foreground">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: colaboradores = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: catalogApi.colaboradores.list,
  });
  const { data: ativos = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['ativos'],
    queryFn: catalogApi.ativos.list,
  });

  const isLoading = loadingProfiles || loadingAssets;

  const stats = useMemo(
    () => ({
      ativos: ativos.length,
      ativosDisponiveis: ativos.filter((item) => item.status === 'disponivel').length,
      ativosEmUso: ativos.filter((item) => item.status === 'em_uso').length,
      ativosManutencao: ativos.filter((item) => item.status === 'manutencao').length,
    }),
    [ativos]
  );

  const recentAssets = ativos.slice(0, 5);
  const assetOwnerById = new Map(colaboradores.map((profile) => [profile.id, profile.nome || profile.email || profile.id]));
  const donutData = [
    { label: 'Disponível', value: stats.ativosDisponiveis, color: '#16a34a' },
    { label: 'Em Uso', value: stats.ativosEmUso, color: '#2563eb' },
    { label: 'Manutenção', value: stats.ativosManutencao, color: '#f59e0b' },
  ].filter((item) => item.value > 0);
  const categoryData = Object.entries(
    ativos.reduce((acc, asset) => {
      const key = asset.categoria || 'Sem categoria';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value }));

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Visão geral dos ativos de TI da MACOM</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard
          title="Total de Ativos"
          value={stats.ativos}
          icon={HardDrive}
          color="bg-[#e50914]"
          iconClassName="text-[#e50914]"
        />
        <StatsCard
          title="Disponíveis"
          value={stats.ativosDisponiveis}
          icon={CheckCircle2}
          color="bg-[#22c55e]"
          iconClassName="text-[#e50914]"
        />
        <StatsCard
          title="Em Uso"
          value={stats.ativosEmUso}
          icon={UsersRound}
          color="bg-[#3b82f6]"
          iconClassName="text-[#e50914]"
        />
        <StatsCard
          title="Manutenção"
          value={stats.ativosManutencao}
          icon={Wrench}
          color="bg-[#f59e0b]"
          iconClassName="text-[#e50914]"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Status dos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={donutData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Ativos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={categoryData} maxValue={Math.max(...categoryData.map((item) => item.value), 1)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Últimos Ativos Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAssets.length ? (
            <div className="divide-y divide-border">
              {recentAssets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <MonitorCog className="h-4 w-4 text-[#e50914]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{asset.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {(asset.patrimonio || 'Sem código')} · {asset.categoria || 'Sem categoria'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        asset.status === 'disponivel'
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                          : asset.status === 'em_uso'
                            ? 'border-blue-200 bg-blue-100 text-blue-800'
                            : asset.status === 'manutencao'
                              ? 'border-amber-200 bg-amber-100 text-amber-800'
                              : 'border-zinc-200 bg-zinc-100 text-zinc-700'
                      }
                    >
                      {asset.status === 'em_uso' ? 'Em Uso' : asset.status === 'disponivel' ? 'Disponível' : asset.status}
                    </Badge>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {assetOwnerById.get(asset.usuario_id) || ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground">Nenhum ativo cadastrado ainda</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
