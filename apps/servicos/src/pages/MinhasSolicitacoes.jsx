import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';
import SolicitacaoDrawer from '@/components/SolicitacaoDrawer';
import NovaSolicitacaoDrawer from '@/components/NovaSolicitacaoDrawer';

const STATUS_VARIANT = {
  pendente: 'secondary',
  aprovado: 'default',
  reprovado: 'destructive',
  pago: 'default',
};

const STATUS_LABEL = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  pago: 'Pago',
};

function formatValor(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

export default function MinhasSolicitacoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [novaOpen, setNovaOpen] = useState(false);

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

      <SolicitacaoDrawer solicitacao={selected} onOpenChange={(open) => !open && setSelected(null)} />
      <NovaSolicitacaoDrawer open={novaOpen} onOpenChange={setNovaOpen} onCreated={load} />
    </div>
  );
}
