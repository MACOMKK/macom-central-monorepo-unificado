import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
  Button,
  Label,
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
  Textarea,
  useToast,
} from '@macom/ui';
import SolicitacaoDrawer from '@/components/SolicitacaoDrawer';
import FiltersDrawer from '@/components/FiltersDrawer';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';
import VencimentoRangeFilter from '@/components/VencimentoRangeFilter';
import { useCategorias, useEmpresas } from '@/hooks/useCatalogos';
import { usePagination } from '@/hooks/usePagination';
import { normalize } from '@/lib/normalize';
import { buildSolicitacaoSearchText, formatDataVencimento, FORMA_PAGAMENTO_LABEL, toLocalDateOnly } from '@/lib/financeiroFormat';

const CATEGORIA_FILTRO_TODAS = 'todas';
const SOLICITANTE_FILTRO_TODOS = 'todos';
const APROVADOR_FILTRO_TODOS = 'todos';
const EMPRESA_FILTRO_TODAS = 'todas';

function formatValor(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Aprovacoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categorias = [] } = useCategorias();
  const { data: empresas = [] } = useEmpresas();
  const [observacoes, setObservacoes] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState(CATEGORIA_FILTRO_TODAS);
  const [solicitanteFiltro, setSolicitanteFiltro] = useState(SOLICITANTE_FILTRO_TODOS);
  const [aprovadorFiltro, setAprovadorFiltro] = useState(APROVADOR_FILTRO_TODOS);
  const [empresaFiltro, setEmpresaFiltro] = useState(EMPRESA_FILTRO_TODAS);
  const [vencimentoFiltro, setVencimentoFiltro] = useState(null);
  const [vencimentoResetToken, setVencimentoResetToken] = useState(0);

  const solicitacoesQuery = useQuery({
    queryKey: ['servicos', 'solicitacoes', 'pendentes'],
    queryFn: () => financeiroApi.solicitacoes.list({ status: 'pendente' }),
  });
  const rows = solicitacoesQuery.data || [];
  const loading = solicitacoesQuery.isLoading;
  const selected = rows.find((row) => row.id === selectedId) || null;

  const solicitantes = useMemo(() => {
    const porId = new Map();
    rows.forEach((row) => {
      if (row.solicitante_id && !porId.has(row.solicitante_id)) {
        porId.set(row.solicitante_id, row.solicitante_nome);
      }
    });
    return Array.from(porId, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rows]);

  const aprovadores = useMemo(() => {
    const porId = new Map();
    rows.forEach((row) => {
      if (row.aprovador_destino_id && !porId.has(row.aprovador_destino_id)) {
        porId.set(row.aprovador_destino_id, row.aprovador_destino_nome);
      }
    });
    return Array.from(porId, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rows]);

  const filteredRows = rows.filter((row) => {
    if (categoriaFiltro !== CATEGORIA_FILTRO_TODAS && row.categoria_id !== categoriaFiltro) return false;
    if (solicitanteFiltro !== SOLICITANTE_FILTRO_TODOS && String(row.solicitante_id) !== solicitanteFiltro) return false;
    if (aprovadorFiltro !== APROVADOR_FILTRO_TODOS && String(row.aprovador_destino_id) !== aprovadorFiltro) return false;
    if (empresaFiltro !== EMPRESA_FILTRO_TODAS && String(row.empresa_id) !== empresaFiltro) return false;
    if (vencimentoFiltro) {
      const dia = toLocalDateOnly(row.vencimento_efetivo);
      if (!dia || dia < vencimentoFiltro.from || dia > vencimentoFiltro.to) return false;
    }
    const termo = normalize(busca);
    if (!termo) return true;
    return normalize(buildSolicitacaoSearchText(row)).includes(termo);
  });
  const { page, setPage, pageItems, total } = usePagination(filteredRows, 10);

  const pendentesKey = ['servicos', 'solicitacoes', 'pendentes'];

  const decisaoMutation = useMutation({
    mutationFn: ({ id, status, observacao }) => financeiroApi.solicitacoes.setStatus(id, status, observacao || null),
    onMutate: ({ id }) => {
      const previous = queryClient.getQueryData(pendentesKey);
      // Remove otimisticamente da lista de pendentes (a decisao tira a solicitacao dessa fila) —
      // o drawer fecha sozinho, ja que `selected` e derivado de `rows.find(...)`.
      queryClient.setQueryData(pendentesKey, (old) => (old || []).filter((row) => row.id !== id));
      return { previous };
    },
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'solicitacoes'] });
      toast({ title: status === 'aprovado' ? 'Solicitação aprovada' : 'Solicitação reprovada' });
    },
    onError: (error, _variables, context) => {
      // Reverte a lista — como `selected` e derivado da lista, o drawer reabre sozinho na mesma
      // solicitacao, com a observacao digitada intacta (esta em outro state, nao foi tocada).
      if (context?.previous) queryClient.setQueryData(pendentesKey, context.previous);
      toast({
        title: 'Não foi possível processar a solicitação',
        description: `${error.message} Revise e tente novamente.`,
      });
    },
  });

  function handleDecision(id, status) {
    decisaoMutation.mutate({ id, status, observacao: observacoes[id] });
  }

  const activeFilterCount = [
    categoriaFiltro !== CATEGORIA_FILTRO_TODAS,
    solicitanteFiltro !== SOLICITANTE_FILTRO_TODOS,
    aprovadorFiltro !== APROVADOR_FILTRO_TODOS,
    empresaFiltro !== EMPRESA_FILTRO_TODAS,
    Boolean(vencimentoFiltro),
  ].filter(Boolean).length;

  function handleClearFiltros() {
    setCategoriaFiltro(CATEGORIA_FILTRO_TODAS);
    setSolicitanteFiltro(SOLICITANTE_FILTRO_TODOS);
    setAprovadorFiltro(APROVADOR_FILTRO_TODOS);
    setEmpresaFiltro(EMPRESA_FILTRO_TODAS);
    setVencimentoFiltro(null);
    setVencimentoResetToken((current) => current + 1);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Solicitações pendentes de aprovação</h2>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64 space-y-1">
          <span className="text-xs text-muted-foreground">Pesquisar</span>
          <SearchInput value={busca} onChange={setBusca} placeholder="Pesquisar em qualquer coluna..." />
        </div>

        <FiltersDrawer activeCount={activeFilterCount} onClear={handleClearFiltros}>
          <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPRESA_FILTRO_TODAS}>Todas as empresas</SelectItem>
              {empresas.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CATEGORIA_FILTRO_TODAS}>Todas as categorias</SelectItem>
              {categorias.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={solicitanteFiltro} onValueChange={setSolicitanteFiltro}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SOLICITANTE_FILTRO_TODOS}>Todos os solicitantes</SelectItem>
              {solicitantes.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={aprovadorFiltro} onValueChange={setAprovadorFiltro}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={APROVADOR_FILTRO_TODOS}>Todos os aprovadores</SelectItem>
              {aprovadores.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <VencimentoRangeFilter onChange={setVencimentoFiltro} resetToken={vencimentoResetToken} />
        </FiltersDrawer>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Carregando...
        </div>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {rows.length === 0 ? 'Nenhuma solicitação pendente.' : 'Nenhuma solicitação corresponde à pesquisa.'}
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Forma de pagamento</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Aprovador</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelectedId(row.id)}>
                  <TableCell className="font-medium">{row.titulo || '-'}</TableCell>
                  <TableCell>{row.solicitante_nome}</TableCell>
                  <TableCell>{formatDataVencimento(row.vencimento_efetivo)}</TableCell>
                  <TableCell>{FORMA_PAGAMENTO_LABEL[row.forma_pagamento] || '-'}</TableCell>
                  <TableCell>{row.categoria || '-'}</TableCell>
                  <TableCell className="font-medium">{row.fornecedor}</TableCell>
                  <TableCell>{row.aprovador_destino_nome || '-'}</TableCell>
                  <TableCell>{formatValor(row.valor)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); setSelectedId(row.id); }}>
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={10} total={total} onPageChange={setPage} itemLabel="solicitação(ões)" />
        </>
      )}

      <SolicitacaoDrawer
        solicitacao={selected}
        onOpenChange={(open) => !open && setSelectedId(null)}
        footer={
          selected && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="observacao-analise">Observação (opcional)</Label>
                <Textarea
                  id="observacao-analise"
                  rows={2}
                  placeholder="Observação (opcional)"
                  value={observacoes[selected.id] || ''}
                  onChange={(event) =>
                    setObservacoes((current) => ({ ...current, [selected.id]: event.target.value }))
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={decisaoMutation.isPending}
                  onClick={() => handleDecision(selected.id, 'reprovado')}
                >
                  <X className="mr-1 h-4 w-4" />
                  Reprovar
                </Button>
                <Button disabled={decisaoMutation.isPending} onClick={() => handleDecision(selected.id, 'aprovado')}>
                  <Check className="mr-1 h-4 w-4" />
                  Aprovar
                </Button>
              </div>
            </div>
          )
        }
      />
    </div>
  );
}
