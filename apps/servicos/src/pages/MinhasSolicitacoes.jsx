import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Plus, X } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
  Badge,
  Button,
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
import { useAuth } from '@/lib/AuthContext';
import {
  buildSolicitacaoSearchText,
  formatDataVencimento,
  formatValor,
  FORMA_PAGAMENTO_LABEL,
  isParcialmentePago,
  STATUS_LABEL,
  STATUS_VARIANT,
  toDateOnly,
} from '@/lib/financeiroFormat';
import SolicitacaoDrawer from '@/components/SolicitacaoDrawer';
import SolicitacaoCard from '@/components/SolicitacaoCard';
import NovaSolicitacaoDrawer from '@/components/NovaSolicitacaoDrawer';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import FiltersDrawer from '@/components/FiltersDrawer';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';
import VencimentoRangeFilter from '@/components/VencimentoRangeFilter';
import { useCategorias, useEmpresas } from '@/hooks/useCatalogos';
import { usePagination } from '@/hooks/usePagination';
import { normalize } from '@/lib/normalize';

const STATUS_FILTRO_TODOS = 'todos';
const CATEGORIA_FILTRO_TODAS = 'todas';
const SOLICITANTE_FILTRO_TODOS = 'todos';
const APROVADOR_FILTRO_TODOS = 'todos';
const EMPRESA_FILTRO_TODAS = 'todas';

export default function MinhasSolicitacoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categorias = [] } = useCategorias();
  const { data: empresas = [] } = useEmpresas();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState(null);
  const [novaOpen, setNovaOpen] = useState(false);
  const [formTarget, setFormTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [reprovarTarget, setReprovarTarget] = useState(null);
  const [reprovarMotivo, setReprovarMotivo] = useState('');
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState(STATUS_FILTRO_TODOS);
  const [categoriaFiltro, setCategoriaFiltro] = useState(CATEGORIA_FILTRO_TODAS);
  const [solicitanteFiltro, setSolicitanteFiltro] = useState(SOLICITANTE_FILTRO_TODOS);
  const [aprovadorFiltro, setAprovadorFiltro] = useState(APROVADOR_FILTRO_TODOS);
  const [empresaFiltro, setEmpresaFiltro] = useState(EMPRESA_FILTRO_TODAS);
  const [vencimentoFiltro, setVencimentoFiltro] = useState(null);
  const [vencimentoResetToken, setVencimentoResetToken] = useState(0);

  const solicitacoesQuery = useQuery({
    queryKey: ['servicos', 'solicitacoes', 'minhas'],
    queryFn: () => financeiroApi.solicitacoes.list(),
  });
  const rows = solicitacoesQuery.data || [];
  const loading = solicitacoesQuery.isLoading;
  const selected = rows.find((row) => row.id === selectedId) || null;

  // Resolve o link de compartilhamento (?sol=<id>, gerado pelo WhatsAppShareButton no drawer):
  // abre a solicitacao automaticamente ao carregar. So roda uma vez, depois que a lista carrega.
  const linkCompartilhadoResolvidoRef = useRef(false);
  useEffect(() => {
    if (linkCompartilhadoResolvidoRef.current || loading) return;
    const solId = searchParams.get('sol');
    linkCompartilhadoResolvidoRef.current = true;
    if (!solId) return;

    if (rows.some((row) => row.id === solId)) {
      setSelectedId(solId);
    } else {
      toast({
        title: 'Solicitação não encontrada',
        description: 'Ela pode ter sido removida ou você não tem acesso a ela.',
      });
    }
    setSearchParams(
      (params) => {
        params.delete('sol');
        return params;
      },
      { replace: true },
    );
  }, [loading, rows, searchParams, setSearchParams, toast]);

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
    if (statusFiltro !== STATUS_FILTRO_TODOS && row.status !== statusFiltro) return false;
    if (categoriaFiltro !== CATEGORIA_FILTRO_TODAS && row.categoria_id !== categoriaFiltro) return false;
    if (solicitanteFiltro !== SOLICITANTE_FILTRO_TODOS && String(row.solicitante_id) !== solicitanteFiltro) return false;
    if (aprovadorFiltro !== APROVADOR_FILTRO_TODOS && String(row.aprovador_destino_id) !== aprovadorFiltro) return false;
    if (empresaFiltro !== EMPRESA_FILTRO_TODAS && String(row.empresa_id) !== empresaFiltro) return false;
    if (vencimentoFiltro) {
      const dia = toDateOnly(row.vencimento_efetivo);
      if (!dia || dia < vencimentoFiltro.from || dia > vencimentoFiltro.to) return false;
    }
    const termo = normalize(busca);
    if (!termo) return true;
    return normalize(buildSolicitacaoSearchText(row)).includes(termo);
  });
  const { page, setPage, pageItems, total } = usePagination(filteredRows, 15);

  const minhasSolicitacoesKey = ['servicos', 'solicitacoes', 'minhas'];

  const cancelarMutation = useMutation({
    mutationFn: ({ id, motivo }) => financeiroApi.solicitacoes.cancelar(id, motivo),
    onMutate: ({ id }) => {
      const previous = queryClient.getQueryData(minhasSolicitacoesKey);
      queryClient.setQueryData(minhasSolicitacoesKey, (old) =>
        (old || []).map((row) => (row.id === id ? { ...row, status: 'cancelado' } : row)),
      );
      setCancelTarget(null);
      setCancelMotivo('');
      setSelectedId(null);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'solicitacoes'] });
      toast({ title: 'Solicitação cancelada' });
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(minhasSolicitacoesKey, context.previous);
      toast({ title: 'Não foi possível cancelar a solicitação', description: `${error.message} Tente novamente.` });
    },
  });

  const reprovarMutation = useMutation({
    mutationFn: ({ id, motivo }) => financeiroApi.solicitacoes.setStatus(id, 'reprovado', motivo),
    onMutate: ({ id }) => {
      const previous = queryClient.getQueryData(minhasSolicitacoesKey);
      queryClient.setQueryData(minhasSolicitacoesKey, (old) =>
        (old || []).map((row) => (row.id === id ? { ...row, status: 'reprovado' } : row)),
      );
      setReprovarTarget(null);
      setReprovarMotivo('');
      setSelectedId(null);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'solicitacoes'] });
      toast({ title: 'Solicitação reprovada' });
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(minhasSolicitacoesKey, context.previous);
      toast({ title: 'Não foi possível reprovar a solicitação', description: `${error.message} Tente novamente.` });
    },
  });

  const title = 'Solicitações';

  function handleCancelar() {
    if (!cancelTarget) return;
    cancelarMutation.mutate({ id: cancelTarget.id, motivo: cancelMotivo.trim() || null });
  }

  function handleReprovar() {
    if (!reprovarTarget || !reprovarMotivo.trim()) return;
    reprovarMutation.mutate({ id: reprovarTarget.id, motivo: reprovarMotivo.trim() });
  }

  const isDono = (row) => String(row.solicitante_id) === String(user?.collaborator?.id);
  const isAprovadorDestino = (row) =>
    user?.isAprovador && String(row.aprovador_destino_id) === String(user?.collaborator?.id);

  const activeFilterCount = [
    statusFiltro !== STATUS_FILTRO_TODOS,
    categoriaFiltro !== CATEGORIA_FILTRO_TODAS,
    solicitanteFiltro !== SOLICITANTE_FILTRO_TODOS,
    aprovadorFiltro !== APROVADOR_FILTRO_TODOS,
    empresaFiltro !== EMPRESA_FILTRO_TODAS,
    Boolean(vencimentoFiltro),
  ].filter(Boolean).length;

  function handleClearFiltros() {
    setStatusFiltro(STATUS_FILTRO_TODOS);
    setCategoriaFiltro(CATEGORIA_FILTRO_TODAS);
    setSolicitanteFiltro(SOLICITANTE_FILTRO_TODOS);
    setAprovadorFiltro(APROVADOR_FILTRO_TODOS);
    setEmpresaFiltro(EMPRESA_FILTRO_TODAS);
    setVencimentoFiltro(null);
    setVencimentoResetToken((current) => current + 1);
  }

  function renderFooter() {
    if (!selected) return null;
    if (selected.status === 'pendente' && isDono(selected)) {
      return (
        <div className="flex w-full gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setFormTarget(selected)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setCancelTarget(selected)}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        </div>
      );
    }
    if (selected.status === 'reprovado' && isDono(selected)) {
      return (
        <Button className="w-full" onClick={() => setFormTarget(selected)}>
          <Pencil className="mr-2 h-4 w-4" />
          Corrigir e reenviar
        </Button>
      );
    }
    if (selected.status === 'aprovado' && (user?.isFinanceiro || isAprovadorDestino(selected))) {
      return (
        <Button variant="outline" className="w-full" onClick={() => setReprovarTarget(selected)}>
          <X className="mr-2 h-4 w-4" />
          Reprovar
        </Button>
      );
    }
    if (selected.status === 'pago' && user?.isFinanceiro) {
      return (
        <Button variant="outline" className="w-full" onClick={() => setCancelTarget(selected)}>
          <X className="mr-2 h-4 w-4" />
          Cancelar pagamento
        </Button>
      );
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <Button size="sm" onClick={() => setNovaOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova solicitação
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full space-y-1 sm:w-64">
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar..." />
        </div>

        <div className="w-48 space-y-1">
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_FILTRO_TODOS}>Todos os status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

          {(user?.isAprovador || user?.isPagador) && (
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
          )}

          {(user?.isAprovador || user?.isPagador) && (
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
          )}

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
          {rows.length === 0 ? 'Nenhuma solicitação encontrada.' : 'Nenhuma solicitação corresponde à pesquisa.'}
        </p>
      ) : (
        <>
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Forma de pagamento</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Aprovador</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((row) => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-primary/10" onClick={() => setSelectedId(row.id)}>
                  <TableCell className="max-w-xs truncate">{row.titulo || '-'}</TableCell>
                  <TableCell>{formatDataVencimento(row.vencimento_efetivo)}</TableCell>
                  <TableCell>{FORMA_PAGAMENTO_LABEL[row.forma_pagamento] || '-'}</TableCell>
                  <TableCell>{row.categoria || '-'}</TableCell>
                  <TableCell className="font-medium">{row.fornecedor}</TableCell>
                  <TableCell>{row.aprovador_destino_nome || '-'}</TableCell>
                  <TableCell>{formatValor(row.valor)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status] || row.status}</Badge>
                      {row.status === 'aprovado' && isParcialmentePago(row) && (
                        <Badge variant="outline">
                          Parcialmente pago ({row.parcelas_pagas}/{row.parcelas_total})
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); setSelectedId(row.id); }}>
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="space-y-3 md:hidden">
            {pageItems.map((row) => (
              <SolicitacaoCard
                key={row.id}
                row={row}
                onClick={() => setSelectedId(row.id)}
                showAprovador
                badges={
                  <>
                    <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status] || row.status}</Badge>
                    {row.status === 'aprovado' && isParcialmentePago(row) && (
                      <Badge variant="outline">
                        Parcialmente pago ({row.parcelas_pagas}/{row.parcelas_total})
                      </Badge>
                    )}
                  </>
                }
              />
            ))}
          </div>

          <Pagination page={page} pageSize={15} total={total} onPageChange={setPage} itemLabel="solicitação(ões)" />
        </>
      )}

      <SolicitacaoDrawer
        solicitacao={selected}
        onOpenChange={(open) => !open && setSelectedId(null)}
        footer={renderFooter()}
      />
      <NovaSolicitacaoDrawer open={novaOpen} onOpenChange={setNovaOpen} />
      <NovaSolicitacaoDrawer
        open={Boolean(formTarget)}
        onOpenChange={(open) => !open && setFormTarget(null)}
        solicitacao={formTarget}
      />

      <ConfirmDeleteDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelMotivo('');
          }
        }}
        onConfirm={handleCancelar}
        isLoading={cancelarMutation.isPending}
        confirmDisabled={cancelTarget?.status === 'pago' && !cancelMotivo.trim()}
        title={cancelTarget?.status === 'pago' ? 'Cancelar pagamento' : 'Cancelar solicitação'}
        description={
          cancelTarget?.status === 'pago'
            ? 'Isso cancela uma solicitação já paga — use apenas em caso de erro ou duplicidade. As parcelas já pagas permanecem registradas no histórico. Informe o motivo abaixo.'
            : 'Tem certeza que deseja cancelar esta solicitação? Essa ação não pode ser desfeita.'
        }
        confirmLabel={cancelTarget?.status === 'pago' ? 'Cancelar pagamento' : 'Cancelar solicitação'}
        loadingLabel="Cancelando..."
        cancelLabel="Manter solicitação"
      >
        {cancelTarget?.status === 'pago' && (
          <Textarea
            value={cancelMotivo}
            onChange={(event) => setCancelMotivo(event.target.value)}
            placeholder="Motivo do cancelamento (obrigatório)"
            rows={3}
          />
        )}
      </ConfirmDeleteDialog>

      <ConfirmDeleteDialog
        open={Boolean(reprovarTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setReprovarTarget(null);
            setReprovarMotivo('');
          }
        }}
        onConfirm={handleReprovar}
        isLoading={reprovarMutation.isPending}
        confirmDisabled={!reprovarMotivo.trim()}
        title="Reprovar solicitação aprovada"
        description="Isso reverte a aprovação anterior e o solicitante será notificado. Informe o motivo abaixo."
        confirmLabel="Reprovar solicitação"
        loadingLabel="Reprovando..."
        cancelLabel="Manter aprovada"
      >
        <Textarea
          value={reprovarMotivo}
          onChange={(event) => setReprovarMotivo(event.target.value)}
          placeholder="Motivo da reprovação (obrigatório)"
          rows={3}
        />
      </ConfirmDeleteDialog>
    </div>
  );
}
