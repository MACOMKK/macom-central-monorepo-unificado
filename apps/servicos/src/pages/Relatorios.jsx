import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Ban,
  Clock,
  Hourglass,
  PieChart as PieChartIcon,
  Receipt,
  RotateCcw,
  SearchX,
  Tag,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@macom/ui';
import { useEmpresas } from '@/hooks/useCatalogos';
import { formatValor, STATUS_LABEL } from '@/lib/financeiroFormat';

const EMPRESA_FILTRO_TODAS = 'todas';

const VIZ_BLUE = '#2a78d6';

// Cores fixas por status -- mesmo significado usado em STATUS_VARIANT (badges): pendente em
// alerta, aprovado em sucesso, pago em azul (mesma cor "info" dos badges), reprovado em critico,
// cancelado neutro. Nunca e a unica forma de distinguir o status: sempre acompanha o nome via
// legenda/tooltip/tabela.
const STATUS_CHART_COLOR = {
  pendente: '#fab219',
  aprovado: '#0ca30c',
  pago: VIZ_BLUE,
  reprovado: '#d03b3b',
  cancelado: '#898781',
};

// Tons suaves reaproveitando a mesma familia de cor dos badges de status (emerald/blue/amber/
// destructive), so que em versao "tint" (fundo claro + texto forte) pros cartoes de resumo --
// mantem a paleta do app em vez de inventar cores novas.
const TONE_CLASSNAMES = {
  neutral: 'bg-muted text-foreground',
  emerald: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
};

const MES_LABEL = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function formatMesLabel(mes) {
  const [ano, mesNum] = String(mes || '').split('-');
  const indice = Number(mesNum) - 1;
  if (!ano || Number.isNaN(indice) || indice < 0 || indice > 11) return mes;
  return `${MES_LABEL[indice]}/${ano.slice(2)}`;
}

function HeroStat({ icon: Icon, label, value, hint, tone = 'neutral' }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${TONE_CLASSNAMES[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="truncate text-3xl font-bold tracking-tight text-foreground">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, hint, tone = 'neutral' }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${TONE_CLASSNAMES[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-semibold text-foreground">{value}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ValorTooltip({ active, payload, label, nameFor }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((item) => (
          <div key={item.dataKey || item.name} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color || item.payload?.fill }} />
            <span className="text-muted-foreground">{nameFor ? nameFor(item) : item.name}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">{formatValor(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriaBarChart({ data }) {
  const altura = Math.max(180, data.length * 38);
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          tickFormatter={(valor) => formatValor(valor)}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="categoria"
          width={110}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ValorTooltip />} />
        <Bar dataKey="valor" fill={VIZ_BLUE} radius={[0, 4, 4, 0]} barSize={18}>
          {/* So a categoria com maior valor (primeira linha, ja vem ordenada desc do backend)
              ganha rotulo direto -- rotular todas vira ruido; o resto fica no eixo/tooltip. */}
          <LabelList
            dataKey="valor"
            content={({ x, y, width, height, index, value }) => {
              if (index !== 0) return null;
              return (
                <text
                  x={x + width + 8}
                  y={y + height / 2}
                  dy={4}
                  fontSize={12}
                  fontWeight={600}
                  fill="hsl(var(--foreground))"
                >
                  {formatValor(value)}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function StatusDonutChart({ data, total }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="valor"
          nameKey="status"
          innerRadius="58%"
          outerRadius="85%"
          paddingAngle={2}
          stroke="hsl(var(--card))"
          strokeWidth={2}
        >
          {data.map((item) => (
            <Cell key={item.status} fill={STATUS_CHART_COLOR[item.status] || '#898781'} />
          ))}
          <Label
            position="center"
            content={({ viewBox }) => {
              const { cx, cy } = viewBox;
              return (
                <text x={cx} y={cy} textAnchor="middle">
                  <tspan x={cx} y={cy - 8} fontSize={10} fontWeight={600} letterSpacing="0.05em" fill="hsl(var(--muted-foreground))">
                    TOTAL
                  </tspan>
                  <tspan x={cx} y={cy + 12} fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
                    {formatValor(total)}
                  </tspan>
                </text>
              );
            }}
          />
        </Pie>
        <Tooltip content={<ValorTooltip nameFor={(item) => STATUS_LABEL[item.payload.status] || item.payload.status} />} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(value, entry) => (
            <span className="text-xs text-muted-foreground">{STATUS_LABEL[entry.payload.status] || value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EvolucaoMensalChart({ data }) {
  const formatted = data.map((item) => ({ ...item, mesLabel: formatMesLabel(item.mes) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, bottom: 4, left: 4 }} barGap={4}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="mesLabel"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(valor) => formatValor(valor)}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ValorTooltip />} />
        <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
        <Bar dataKey="valor_solicitado" name="Solicitado" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} barSize={16} />
        <Bar dataKey="valor_pago" name="Pago" fill={VIZ_BLUE} radius={[4, 4, 0, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Relatorios() {
  const { data: empresas = [] } = useEmpresas();
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [empresaFiltro, setEmpresaFiltro] = useState(EMPRESA_FILTRO_TODAS);

  const temFiltroAtivo = Boolean(dataDe || dataAte || empresaFiltro !== EMPRESA_FILTRO_TODAS);

  const limparFiltros = () => {
    setDataDe('');
    setDataAte('');
    setEmpresaFiltro(EMPRESA_FILTRO_TODAS);
  };

  const filtros = {
    de: dataDe || undefined,
    ate: dataAte || undefined,
    empresa_id: empresaFiltro !== EMPRESA_FILTRO_TODAS ? empresaFiltro : undefined,
  };

  const relatorioQuery = useQuery({
    queryKey: ['servicos', 'relatorios', 'financeiro', dataDe, dataAte, empresaFiltro],
    queryFn: () => financeiroApi.relatorios.financeiro(filtros),
  });

  const resumo = relatorioQuery.data?.resumo;
  const porCategoria = relatorioQuery.data?.porCategoria || [];
  const porStatus = relatorioQuery.data?.porStatus || [];
  const porMes = relatorioQuery.data?.porMes || [];
  const loading = relatorioQuery.isLoading;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Relatórios</h2>
        <p className="text-sm text-muted-foreground">
          Resumo das solicitações de pagamento por período. O período considera a data em que a
          solicitação foi criada.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">De</span>
            <Input type="date" value={dataDe} onChange={(event) => setDataDe(event.target.value)} />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Até</span>
            <Input type="date" value={dataAte} onChange={(event) => setDataAte(event.target.value)} />
          </div>
          <div className="w-56 space-y-1">
            <span className="text-xs text-muted-foreground">Empresa</span>
            <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPRESA_FILTRO_TODAS}>Todas</SelectItem>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {temFiltroAtivo && (
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Carregando...
        </div>
      ) : !resumo || Number(resumo.total_quantidade) === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-14 text-center">
          <SearchX className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nenhuma solicitação encontrada</p>
          <p className="text-xs text-muted-foreground">Ajuste o período ou os filtros acima e tente novamente.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <HeroStat
              icon={Receipt}
              label="Total solicitado"
              value={formatValor(resumo.total_valor)}
              hint={`${resumo.total_quantidade} solicitação(ões) no período`}
              tone="neutral"
            />
            <HeroStat icon={Wallet} label="Total pago" value={formatValor(resumo.total_pago)} tone="emerald" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiTile icon={Clock} label="Em aberto" value={formatValor(resumo.total_em_aberto)} hint="Aprovadas, ainda não quitadas" tone="blue" />
            <KpiTile
              icon={AlertTriangle}
              label="Atrasadas"
              value={formatValor(resumo.valor_atrasadas)}
              hint={`${resumo.total_atrasadas} solicitação(ões)`}
              tone="red"
            />
            <KpiTile icon={Hourglass} label="Pendentes" value={resumo.total_pendentes} hint="Aguardando aprovação" tone="amber" />
            <KpiTile icon={XCircle} label="Reprovadas" value={resumo.total_reprovadas} tone="slate" />
            <KpiTile icon={Ban} label="Canceladas" value={resumo.total_canceladas} tone="slate" />
          </div>

          {porMes.length > 0 && (
            <ChartCard title="Evolução mensal" subtitle="Solicitado x pago, por mês de criação" icon={TrendingUp}>
              <EvolucaoMensalChart data={porMes} />
            </ChartCard>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              {porCategoria.length > 0 && (
                <ChartCard title="Por categoria" subtitle="Valor solicitado, exclui reprovadas e canceladas" icon={Tag}>
                  <CategoriaBarChart data={porCategoria} />
                </ChartCard>
              )}
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porCategoria.map((item) => (
                      <TableRow key={item.categoria}>
                        <TableCell>{item.categoria}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatValor(item.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-3">
              {porStatus.length > 0 && (
                <ChartCard title="Por status" subtitle="Distribuição do valor total por status" icon={PieChartIcon}>
                  <StatusDonutChart data={porStatus} total={resumo.total_valor} />
                </ChartCard>
              )}
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porStatus.map((item) => (
                      <TableRow key={item.status}>
                        <TableCell>{STATUS_LABEL[item.status] || item.status}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatValor(item.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
