import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import { Button, Label, Spinner, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, useToast } from '@macom/ui';
import SolicitacaoDrawer from '@/components/SolicitacaoDrawer';

function formatValor(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

export default function Aprovacoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [observacoes, setObservacoes] = useState({});
  const [selectedId, setSelectedId] = useState(null);

  const solicitacoesQuery = useQuery({
    queryKey: ['servicos', 'solicitacoes', 'pendentes'],
    queryFn: () => financeiroApi.solicitacoes.list({ status: 'pendente' }),
  });
  const rows = solicitacoesQuery.data || [];
  const loading = solicitacoesQuery.isLoading;
  const selected = rows.find((row) => row.id === selectedId) || null;

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
      toast({ title: status === 'aprovado' ? 'Solicitacao aprovada' : 'Solicitacao reprovada' });
    },
    onError: (error, _variables, context) => {
      // Reverte a lista — como `selected` e derivado da lista, o drawer reabre sozinho na mesma
      // solicitacao, com a observacao digitada intacta (esta em outro state, nao foi tocada).
      if (context?.previous) queryClient.setQueryData(pendentesKey, context.previous);
      toast({
        title: 'Nao foi possivel processar a solicitacao',
        description: `${error.message} Revise e tente novamente.`,
      });
    },
  });

  function handleDecision(id, status) {
    decisaoMutation.mutate({ id, status, observacao: observacoes[id] });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Solicitacoes pendentes de aprovacao</h2>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Carregando...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma solicitacao pendente.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Solicitante</TableHead>
              <TableHead>Aprovador</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelectedId(row.id)}>
                <TableCell>{row.solicitante_nome}</TableCell>
                <TableCell>{row.aprovador_destino_nome || '-'}</TableCell>
                <TableCell className="font-medium">{row.fornecedor}</TableCell>
                <TableCell className="max-w-xs truncate">{row.descricao}</TableCell>
                <TableCell>{formatValor(row.valor)}</TableCell>
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
        footer={
          selected && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="observacao-analise">Observacao (opcional)</Label>
                <Textarea
                  id="observacao-analise"
                  rows={2}
                  placeholder="Observacao (opcional)"
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
