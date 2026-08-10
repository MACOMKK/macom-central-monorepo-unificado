import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, X } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import { Badge, Button, Spinner, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';
import { formatData, formatValor, STATUS_LABEL, STATUS_VARIANT } from '@/lib/financeiroFormat';
import SolicitacaoDrawer from '@/components/SolicitacaoDrawer';
import NovaSolicitacaoDrawer from '@/components/NovaSolicitacaoDrawer';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

export default function MinhasSolicitacoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState(null);
  const [novaOpen, setNovaOpen] = useState(false);
  const [reenvioTarget, setReenvioTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const solicitacoesQuery = useQuery({
    queryKey: ['servicos', 'solicitacoes', 'minhas'],
    queryFn: () => financeiroApi.solicitacoes.list(),
  });
  const rows = solicitacoesQuery.data || [];
  const loading = solicitacoesQuery.isLoading;
  const selected = rows.find((row) => row.id === selectedId) || null;

  const minhasSolicitacoesKey = ['servicos', 'solicitacoes', 'minhas'];

  const cancelarMutation = useMutation({
    mutationFn: (id) => financeiroApi.solicitacoes.cancelar(id),
    onMutate: (id) => {
      const previous = queryClient.getQueryData(minhasSolicitacoesKey);
      queryClient.setQueryData(minhasSolicitacoesKey, (old) =>
        (old || []).map((row) => (row.id === id ? { ...row, status: 'cancelado' } : row)),
      );
      setCancelTarget(null);
      setSelectedId(null);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'solicitacoes'] });
      toast({ title: 'Solicitacao cancelada' });
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(minhasSolicitacoesKey, context.previous);
      toast({ title: 'Nao foi possivel cancelar a solicitacao', description: `${error.message} Tente novamente.` });
    },
  });

  const title = user?.isAprovador ? 'Todas as solicitacoes' : 'Minhas solicitacoes';

  function handleCancelar() {
    if (!cancelTarget) return;
    cancelarMutation.mutate(cancelTarget.id);
  }

  const isDono = (row) => String(row.solicitante_id) === String(user?.collaborator?.id);

  function renderFooter() {
    if (!selected) return null;
    if (selected.status === 'pendente' && isDono(selected)) {
      return (
        <Button variant="outline" className="w-full" onClick={() => setCancelTarget(selected)}>
          <X className="mr-2 h-4 w-4" />
          Cancelar solicitacao
        </Button>
      );
    }
    if (selected.status === 'reprovado' && isDono(selected)) {
      return (
        <Button className="w-full" onClick={() => setReenvioTarget(selected)}>
          <Pencil className="mr-2 h-4 w-4" />
          Corrigir e reenviar
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
          Nova solicitacao
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Carregando...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma solicitacao encontrada.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titulo</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelectedId(row.id)}>
                <TableCell className="max-w-xs truncate">{row.titulo || '-'}</TableCell>
                <TableCell className="font-medium">{row.fornecedor}</TableCell>
                <TableCell className="max-w-xs truncate">{row.descricao}</TableCell>
                <TableCell>{formatValor(row.valor)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status] || row.status}</Badge>
                </TableCell>
                <TableCell>{formatData(row.criado_em)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); setSelectedId(row.id); }}>
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <SolicitacaoDrawer
        solicitacao={selected}
        onOpenChange={(open) => !open && setSelectedId(null)}
        footer={renderFooter()}
      />
      <NovaSolicitacaoDrawer open={novaOpen} onOpenChange={setNovaOpen} />
      <NovaSolicitacaoDrawer
        open={Boolean(reenvioTarget)}
        onOpenChange={(open) => !open && setReenvioTarget(null)}
        solicitacao={reenvioTarget}
      />

      <ConfirmDeleteDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        onConfirm={handleCancelar}
        isLoading={cancelarMutation.isPending}
        title="Cancelar solicitacao"
        description="Tem certeza que deseja cancelar esta solicitacao? Essa acao nao pode ser desfeita."
        confirmLabel="Cancelar solicitacao"
        loadingLabel="Cancelando..."
        cancelLabel="Manter solicitacao"
      />
    </div>
  );
}
