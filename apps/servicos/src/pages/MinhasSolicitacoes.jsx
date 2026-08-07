import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, X } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';
import { formatData, formatValor, STATUS_LABEL, STATUS_VARIANT } from '@/lib/financeiroFormat';
import SolicitacaoDrawer from '@/components/SolicitacaoDrawer';
import NovaSolicitacaoDrawer from '@/components/NovaSolicitacaoDrawer';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

export default function MinhasSolicitacoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [novaOpen, setNovaOpen] = useState(false);
  const [reenvioTarget, setReenvioTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  async function load() {
    try {
      const data = await financeiroApi.solicitacoes.list();
      setRows(data);
    } catch (error) {
      toast({ title: 'Nao foi possivel carregar as solicitacoes', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = user?.isAprovador ? 'Todas as solicitacoes' : 'Minhas solicitacoes';

  async function handleCancelar() {
    if (!cancelTarget) return;
    setCancelando(true);
    try {
      const row = await financeiroApi.solicitacoes.cancelar(cancelTarget.id);
      setRows((current) => current.map((item) => (item.id === cancelTarget.id ? row || { ...item, status: 'cancelado' } : item)));
      toast({ title: 'Solicitacao cancelada' });
      setCancelTarget(null);
      setSelected(null);
    } catch (error) {
      toast({ title: 'Nao foi possivel cancelar a solicitacao', description: error.message });
    } finally {
      setCancelando(false);
    }
  }

  function handleReenviada(row) {
    setRows((current) => current.map((item) => (item.id === row.id ? row : item)));
    setReenvioTarget(null);
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
          <Loader2 className="h-4 w-4 animate-spin" />
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
              <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row)}>
                <TableCell className="max-w-xs truncate">{row.titulo || '-'}</TableCell>
                <TableCell className="font-medium">{row.fornecedor}</TableCell>
                <TableCell className="max-w-xs truncate">{row.descricao}</TableCell>
                <TableCell>{formatValor(row.valor)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status] || row.status}</Badge>
                </TableCell>
                <TableCell>{formatData(row.criado_em)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); setSelected(row); }}>
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
        onOpenChange={(open) => !open && setSelected(null)}
        footer={renderFooter()}
      />
      <NovaSolicitacaoDrawer open={novaOpen} onOpenChange={setNovaOpen} onCreated={load} />
      <NovaSolicitacaoDrawer
        open={Boolean(reenvioTarget)}
        onOpenChange={(open) => !open && setReenvioTarget(null)}
        solicitacao={reenvioTarget}
        onCreated={handleReenviada}
      />

      <ConfirmDeleteDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        onConfirm={handleCancelar}
        isLoading={cancelando}
        title="Cancelar solicitacao"
        description="Tem certeza que deseja cancelar esta solicitacao? Essa acao nao pode ser desfeita."
        confirmLabel="Cancelar solicitacao"
        loadingLabel="Cancelando..."
        cancelLabel="Manter solicitacao"
      />
    </div>
  );
}
