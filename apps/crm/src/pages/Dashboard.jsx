import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, DollarSign, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useEmpresa } from '@/context/EmpresaContext';

const CORES_STATUS = ['#94a3b8', '#3b82f6', '#16a34a', '#E30613'];

export default function Dashboard() {
  const { empresa } = useEmpresa();
  const { data: eventos = [] } = useQuery({ queryKey: ['eventos'], queryFn: () => base44.entities.Evento.list('-created_date', 500) });
  const { data: leads = [] } = useQuery({ queryKey: ['leads'], queryFn: () => base44.entities.Lead.list('-created_date', 500) });

  const evs = eventos.filter((e) => empresa === 'Todas' || e.empresa === empresa);
  const lds = leads.filter((l) => empresa === 'Todas' || l.empresa === empresa);

  const statusData = [
    { name: 'Aguardando', value: evs.filter((e) => e.status === 'aguardando').length },
    { name: 'Andamento', value: evs.filter((e) => e.status === 'andamento').length },
    { name: 'Sucesso', value: evs.filter((e) => e.status === 'sucesso').length },
    { name: 'Insucesso', value: evs.filter((e) => e.status === 'insucesso').length },
  ];

  const origemData = ['telefone', 'whatsapp', 'site', 'showroom', 'indicacao'].map((o) => ({
    name: o.charAt(0).toUpperCase() + o.slice(1),
    total: evs.filter((e) => e.origem === o).length,
  }));

  const taxaSucesso = evs.length > 0
    ? Math.round((evs.filter((e) => e.status === 'sucesso').length / evs.length) * 100)
    : 0;

  const cards = [
    { label: 'Total de Eventos', value: evs.length, icon: Tag, color: 'text-[#1a1a1a]', border: 'border-l-[#1a1a1a]' },
    { label: 'Total de Leads', value: lds.length, icon: DollarSign, color: 'text-blue-600', border: 'border-l-blue-600' },
    { label: 'Eventos com Sucesso', value: statusData[2].value, icon: ThumbsUp, color: 'text-green-600', border: 'border-l-green-600' },
    { label: 'Eventos Insucesso', value: statusData[3].value, icon: ThumbsDown, color: 'text-primary', border: 'border-l-primary' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
      <div className="mb-5">
        <h1 className="text-xl font-black uppercase tracking-widest">Dashboard</h1>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Indicadores gerais</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`bg-white shadow-sm border-l-4 ${c.border} p-5 flex items-center justify-between`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{c.label}</p>
              <p className="text-3xl font-black mt-1">{c.value}</p>
            </div>
            <c.icon className={`w-9 h-9 ${c.color} opacity-20`} />
          </div>
        ))}
      </div>

      {/* Taxa de sucesso */}
      <div className="bg-[#1a1a1a] text-white p-5 mb-6 flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Taxa de Conversão</p>
          <p className="text-4xl font-black mt-1">{taxaSucesso}%</p>
        </div>
        <TrendingUp className="w-12 h-12 text-primary opacity-60" />
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white shadow-sm">
          <div className="bg-[#1a1a1a] px-5 py-3">
            <p className="text-white text-[11px] font-bold uppercase tracking-widest">Eventos por Status</p>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                  {statusData.map((_, i) => <Cell key={i} fill={CORES_STATUS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white shadow-sm">
          <div className="bg-[#1a1a1a] px-5 py-3">
            <p className="text-white text-[11px] font-bold uppercase tracking-widest">Eventos por Origem</p>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={origemData} barCategoryGap="35%">
                <XAxis dataKey="name" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <YAxis allowDecimals={false} fontSize={10} fontWeight={700} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <Bar dataKey="total" fill="#E30613" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}