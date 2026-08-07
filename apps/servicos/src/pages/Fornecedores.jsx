import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
  Badge,
  Button,
  Input,
  Label,
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

function formatData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

export default function Fornecedores() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [criando, setCriando] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await financeiroApi.fornecedores.listAdmin();
      setRows(data);
    } catch (error) {
      toast({ title: 'Nao foi possivel carregar os fornecedores', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCriar(event) {
    event.preventDefault();
    const nome = novoNome.trim();
    if (!nome || criando) return;

    setCriando(true);
    try {
      const row = await financeiroApi.fornecedores.criar(nome);
      setRows((current) => {
        if (current.some((item) => item.id === row.id)) {
          return current.map((item) => (item.id === row.id ? row : item));
        }
        return [...current, row].sort((a, b) => a.nome.localeCompare(b.nome));
      });
      setNovoNome('');
      toast({ title: 'Fornecedor cadastrado' });
    } catch (error) {
      toast({ title: 'Nao foi possivel cadastrar o fornecedor', description: error.message });
    } finally {
      setCriando(false);
    }
  }

  function startEdit(row) {
    setEditId(row.id);
    setEditNome(row.nome);
  }

  function cancelEdit() {
    setEditId(null);
    setEditNome('');
  }

  async function handleSalvarNome(row) {
    const nome = editNome.trim();
    if (!nome) return;

    setSavingId(row.id);
    try {
      const updated = await financeiroApi.fornecedores.atualizar(row.id, { nome, ativo: row.ativo });
      setRows((current) => current.map((item) => (item.id === row.id ? updated : item)));
      cancelEdit();
      toast({ title: 'Fornecedor atualizado' });
    } catch (error) {
      toast({ title: 'Nao foi possivel atualizar o fornecedor', description: error.message });
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleAtivo(row) {
    setSavingId(row.id);
    try {
      const updated = await financeiroApi.fornecedores.atualizar(row.id, { nome: row.nome, ativo: !row.ativo });
      setRows((current) => current.map((item) => (item.id === row.id ? updated : item)));
      toast({ title: updated.ativo ? 'Fornecedor reativado' : 'Fornecedor inativado' });
    } catch (error) {
      toast({ title: 'Nao foi possivel atualizar o fornecedor', description: error.message });
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeletar() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await financeiroApi.fornecedores.deletar(deleteTarget.id);
      setRows((current) => current.filter((item) => item.id !== deleteTarget.id));
      toast({ title: 'Fornecedor excluido' });
      setDeleteTarget(null);
    } catch (error) {
      toast({ title: 'Nao foi possivel excluir o fornecedor', description: error.message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Fornecedores</h2>
        <p className="text-sm text-muted-foreground">
          Cadastro de fornecedores usado nas solicitacoes de pagamento. Fornecedores inativos deixam
          de aparecer no select de nova solicitacao, mas continuam vinculados as solicitacoes ja
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
        <Button type="submit" disabled={criando || !novoNome.trim()}>
          {criando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
          Cadastrar
        </Button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-xs">
                    {editId === row.id ? (
                      <Input
                        autoFocus
                        value={editNome}
                        onChange={(event) => setEditNome(event.target.value)}
                        disabled={savingId === row.id}
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
                        disabled={savingId === row.id}
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
                        <Button variant="outline" size="sm" onClick={cancelEdit} disabled={savingId === row.id}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={() => handleSalvarNome(row)} disabled={savingId === row.id}>
                          {savingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
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
                                ? `Usado em ${row.total_solicitacoes} solicitacao(oes) — nao pode ser excluido, apenas inativado.`
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

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeletar}
        isLoading={deleting}
        title="Excluir fornecedor"
        description={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Essa acao nao pode ser desfeita. So e possivel excluir fornecedores que nunca foram usados em nenhuma solicitacao.`}
      />
    </div>
  );
}
