import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
  Badge,
  Button,
  Input,
  Label,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from '@macom/ui';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';
import { usePagination } from '@/hooks/usePagination';
import { normalize } from '@/lib/normalize';

function formatData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

const fornecedoresKey = ['servicos', 'fornecedores', 'admin'];

function invalidateFornecedoresCatalogo(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['servicos', 'fornecedores'], exact: true });
  queryClient.invalidateQueries({ queryKey: ['servicos', 'catalogos-solicitacao'] });
}

export default function Fornecedores() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [novoNome, setNovoNome] = useState('');
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busca, setBusca] = useState('');

  const fornecedoresQuery = useQuery({
    queryKey: fornecedoresKey,
    queryFn: () => financeiroApi.fornecedores.listAdmin(),
  });
  const rows = fornecedoresQuery.data || [];
  const loading = fornecedoresQuery.isLoading;
  const filteredRows = rows.filter((row) => !busca.trim() || normalize(row.nome).includes(normalize(busca)));
  const { page, setPage, pageItems, total } = usePagination(filteredRows, 10);

  const criarMutation = useMutation({
    mutationFn: ({ nome }) => financeiroApi.fornecedores.criar(nome),
    onMutate: ({ nome, tempId }) => {
      const previous = queryClient.getQueryData(fornecedoresKey);
      const optimisticRow = { id: tempId, nome, ativo: true, criado_em: new Date().toISOString(), total_solicitacoes: 0 };
      queryClient.setQueryData(fornecedoresKey, (old) => [...(old || []), optimisticRow]);
      setNovoNome('');
      return { previous, tempId };
    },
    onSuccess: (row, _variables, context) => {
      queryClient.setQueryData(fornecedoresKey, (old) =>
        (old || []).map((item) => (item.id === context.tempId ? { ...item, ...row } : item)),
      );
      invalidateFornecedoresCatalogo(queryClient);
      toast({ title: 'Fornecedor cadastrado' });
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(fornecedoresKey, context.previous);
      toast({ title: 'Não foi possível cadastrar o fornecedor', description: error.message });
    },
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, nome, ativo }) => financeiroApi.fornecedores.atualizar(id, { nome, ativo }),
    onMutate: ({ id, nome, ativo }) => {
      const previous = queryClient.getQueryData(fornecedoresKey);
      queryClient.setQueryData(fornecedoresKey, (old) =>
        (old || []).map((item) => (item.id === id ? { ...item, nome, ativo } : item)),
      );
      cancelEdit();
      return { previous };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(fornecedoresKey, (old) =>
        (old || []).map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      invalidateFornecedoresCatalogo(queryClient);
      toast({ title: 'Fornecedor atualizado' });
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(fornecedoresKey, context.previous);
      toast({ title: 'Não foi possível atualizar o fornecedor', description: error.message });
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, nome, ativo }) => financeiroApi.fornecedores.atualizar(id, { nome, ativo }),
    onMutate: ({ id, ativo }) => {
      const previous = queryClient.getQueryData(fornecedoresKey);
      queryClient.setQueryData(fornecedoresKey, (old) =>
        (old || []).map((item) => (item.id === id ? { ...item, ativo } : item)),
      );
      return { previous };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(fornecedoresKey, (old) =>
        (old || []).map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      invalidateFornecedoresCatalogo(queryClient);
      toast({ title: updated.ativo ? 'Fornecedor reativado' : 'Fornecedor inativado' });
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(fornecedoresKey, context.previous);
      toast({ title: 'Não foi possível atualizar o fornecedor', description: error.message });
    },
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => financeiroApi.fornecedores.deletar(id),
    onMutate: (id) => {
      const previous = queryClient.getQueryData(fornecedoresKey);
      queryClient.setQueryData(fornecedoresKey, (old) => (old || []).filter((item) => item.id !== id));
      setDeleteTarget(null);
      return { previous };
    },
    onSuccess: () => {
      invalidateFornecedoresCatalogo(queryClient);
      toast({ title: 'Fornecedor excluído' });
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(fornecedoresKey, context.previous);
      toast({ title: 'Não foi possível excluir o fornecedor', description: error.message });
    },
  });

  function handleCriar(event) {
    event.preventDefault();
    const nome = novoNome.trim();
    if (!nome || criarMutation.isPending) return;
    criarMutation.mutate({ nome, tempId: `optimistic-${crypto.randomUUID()}` });
  }

  function startEdit(row) {
    setEditId(row.id);
    setEditNome(row.nome);
  }

  function cancelEdit() {
    setEditId(null);
    setEditNome('');
  }

  function handleSalvarNome(row) {
    const nome = editNome.trim();
    if (!nome) return;
    atualizarMutation.mutate({ id: row.id, nome, ativo: row.ativo });
  }

  function handleToggleAtivo(row) {
    toggleAtivoMutation.mutate({ id: row.id, nome: row.nome, ativo: !row.ativo });
  }

  function handleDeletar() {
    if (!deleteTarget) return;
    deletarMutation.mutate(deleteTarget.id);
  }

  const isSaving = (id) => atualizarMutation.variables?.id === id && atualizarMutation.isPending
    || toggleAtivoMutation.variables?.id === id && toggleAtivoMutation.isPending;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Fornecedores</h2>
        <p className="text-sm text-muted-foreground">
          Cadastro de fornecedores usado nas solicitações de pagamento. Fornecedores inativos deixam
          de aparecer no select de nova solicitação, mas continuam vinculados às solicitações já
          criadas.
        </p>
      </div>

      <form onSubmit={handleCriar} className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="novoFornecedor">Novo fornecedor</Label>
          <Input
            id="novoFornecedor"
            value={novoNome}
            onChange={(event) => setNovoNome(event.target.value)}
            placeholder="Nome do fornecedor"
          />
        </div>
        <Button type="submit" disabled={criarMutation.isPending || !novoNome.trim()}>
          {criarMutation.isPending ? <Spinner size="sm" className="mr-1" /> : <Plus className="mr-1 h-4 w-4" />}
          Cadastrar
        </Button>
      </form>

      <SearchInput value={busca} onChange={setBusca} placeholder="Buscar..." className="max-w-sm" />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Carregando...
        </div>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {rows.length === 0 ? 'Nenhum fornecedor cadastrado.' : 'Nenhum fornecedor corresponde à pesquisa.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-xs">
                    {editId === row.id ? (
                      <Input
                        autoFocus
                        value={editNome}
                        onChange={(event) => setEditNome(event.target.value)}
                        disabled={isSaving(row.id)}
                      />
                    ) : (
                      <span className="font-medium">{row.nome}</span>
                    )}
                  </TableCell>
                  <TableCell>{formatData(row.criado_em)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.ativo}
                        disabled={isSaving(row.id)}
                        onCheckedChange={() => handleToggleAtivo(row)}
                      />
                      <Badge variant={row.ativo ? 'default' : 'secondary'}>
                        {row.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {editId === row.id ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving(row.id)}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={() => handleSalvarNome(row)} disabled={isSaving(row.id)}>
                          {isSaving(row.id) ? <Spinner size="sm" /> : 'Salvar'}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(row)}>
                          Editar nome
                        </Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={row.total_solicitacoes > 0}
                                  onClick={() => setDeleteTarget(row)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {row.total_solicitacoes > 0
                                ? `Usado em ${row.total_solicitacoes} solicitação(ões) — não pode ser excluído, apenas inativado.`
                                : 'Excluir fornecedor'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredRows.length > 0 && (
        <Pagination page={page} pageSize={10} total={total} onPageChange={setPage} itemLabel="fornecedor(es)" />
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeletar}
        isLoading={deletarMutation.isPending}
        title="Excluir fornecedor"
        description={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Essa ação não pode ser desfeita. Só é possível excluir fornecedores que nunca foram usados em nenhuma solicitação.`}
      />
    </div>
  );
}
