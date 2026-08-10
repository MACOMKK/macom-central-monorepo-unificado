import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
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
  useToast,
} from '@macom/ui';

import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { MODULOS_PERMISSAO } from '@/lib/modulosPermissao';

const MODULOS_ATIVOS = MODULOS_PERMISSAO.filter((modulo) => modulo.ativo);

// colaborador_id -> { [modulo]: papel }
function indexByColaborador(permissoes) {
  const index = {};
  for (const item of permissoes) {
    if (!index[item.colaborador_id]) index[item.colaborador_id] = {};
    index[item.colaborador_id][item.modulo] = item.papel;
  }
  return index;
}

export default function Permissoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [limpezaDialogOpen, setLimpezaDialogOpen] = useState(false);

  const permissoesQuery = useQuery({
    queryKey: ['servicos', 'permissoes'],
    queryFn: () => financeiroApi.permissoes.list(),
  });
  const colaboradores = permissoesQuery.data?.colaboradores || [];
  const permissoesPorColaborador = useMemo(
    () => indexByColaborador(permissoesQuery.data?.permissoes || []),
    [permissoesQuery.data],
  );
  const loading = permissoesQuery.isLoading;

  const alterarMutation = useMutation({
    mutationFn: ({ colaboradorId, modulo, papel }) => financeiroApi.permissoes.set(colaboradorId, modulo, papel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'permissoes'] });
      toast({ title: 'Permissao atualizada' });
    },
    onError: (error) => toast({ title: 'Nao foi possivel atualizar a permissao', description: error.message }),
  });

  const limparDadosMutation = useMutation({
    mutationFn: () => financeiroApi.admin.limparDadosTeste(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'solicitacoes'] });
      queryClient.invalidateQueries({ queryKey: ['servicos', 'fornecedores'] });
      queryClient.invalidateQueries({ queryKey: ['servicos', 'categorias'] });
      queryClient.invalidateQueries({ queryKey: ['servicos', 'catalogos-solicitacao'] });
      toast({
        title: 'Dados de teste removidos',
        description: `${result.solicitacoes_removidas || 0} solicitacao(oes) e ${result.anexos_removidos_storage || 0} anexo(s) do storage foram apagados.`,
      });
      setLimpezaDialogOpen(false);
    },
    onError: (error) => toast({ title: 'Nao foi possivel limpar os dados de teste', description: error.message }),
  });

  function papelDe(colaboradorId, modulo) {
    return permissoesPorColaborador[colaboradorId]?.[modulo] || 'usuario';
  }

  function handleChange(colaboradorId, modulo, papel) {
    alterarMutation.mutate({ colaboradorId, modulo, papel });
  }

  const isSaving = (colaboradorId, modulo) =>
    alterarMutation.isPending &&
    alterarMutation.variables?.colaboradorId === colaboradorId &&
    alterarMutation.variables?.modulo === modulo;

  const modulosEmBreve = useMemo(() => MODULOS_PERMISSAO.filter((modulo) => !modulo.ativo), []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Permissoes por modulo</h2>
        <p className="text-sm text-muted-foreground">
          Define o papel de cada colaborador em cada modulo do Servicos. Quem tem acesso
          &quot;Admin&quot; ao sistema (console) sempre tem papel maximo em todos os modulos.
          {modulosEmBreve.length > 0 && (
            <> Colunas em cinza sao modulos ainda sem tela real — aparecem aqui so pra dar visao do que vem a seguir.</>
          )}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Carregando...
        </div>
      ) : colaboradores.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum colaborador com acesso ao Servicos.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Acesso ao sistema</TableHead>
                {MODULOS_PERMISSAO.map((modulo) => (
                  <TableHead key={modulo.key} className={modulo.ativo ? undefined : 'text-muted-foreground'}>
                    {modulo.label}
                    {!modulo.ativo && (
                      <span className="ml-1 text-[10px] font-normal uppercase tracking-wide">(em breve)</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {colaboradores.map((colaborador) => {
                const isSystemAdmin = colaborador.system_access_level === 'admin';
                return (
                  <TableRow key={colaborador.colaborador_id}>
                    <TableCell>
                      <div className="font-medium">{colaborador.nome}</div>
                      <div className="text-xs text-muted-foreground">{colaborador.email}</div>
                    </TableCell>
                    <TableCell className="capitalize">{colaborador.system_access_level}</TableCell>
                    {MODULOS_ATIVOS.map((modulo) => (
                      <TableCell key={modulo.key} className="max-w-[220px]">
                        {isSystemAdmin ? (
                          <span className="text-xs text-muted-foreground">Acesso total</span>
                        ) : (
                          <Select
                            value={papelDe(colaborador.colaborador_id, modulo.key)}
                            disabled={isSaving(colaborador.colaborador_id, modulo.key)}
                            onValueChange={(value) => handleChange(colaborador.colaborador_id, modulo.key, value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {modulo.papeis.map((papel) => (
                                <SelectItem key={papel.value} value={papel.value}>
                                  {papel.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    ))}
                    {modulosEmBreve.map((modulo) => (
                      <TableCell key={modulo.key} className="text-xs text-muted-foreground">
                        —
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h3 className="text-sm font-bold text-destructive">Zona de risco</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Apaga todas as solicitacoes de pagamento, parcelas, historico e anexos (incluindo os
          arquivos no storage) do modulo Financeiro. Fornecedores, categorias e as permissoes por
          modulo nao sao afetados. Use apenas para limpar dados de teste.
        </p>
        <Button
          type="button"
          variant="destructive"
          className="mt-3"
          onClick={() => setLimpezaDialogOpen(true)}
        >
          Limpar dados de teste
        </Button>
      </div>

      <ConfirmDeleteDialog
        open={limpezaDialogOpen}
        onOpenChange={setLimpezaDialogOpen}
        onConfirm={() => limparDadosMutation.mutate()}
        isLoading={limparDadosMutation.isPending}
        title="Limpar dados de teste do Financeiro"
        description="Isso vai apagar permanentemente todas as solicitacoes de pagamento, parcelas, historico e anexos (tabelas e arquivos no storage). Fornecedores, categorias e as permissoes por modulo nao sao afetados. Essa acao nao pode ser desfeita."
        confirmLabel="Limpar dados"
      />
    </div>
  );
}
