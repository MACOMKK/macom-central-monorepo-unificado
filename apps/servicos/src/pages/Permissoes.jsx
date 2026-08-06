import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@macom/ui';

import { MODULOS_PERMISSAO, PAPEIS_MODULO } from '@/lib/modulosPermissao';

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
  const [colaboradores, setColaboradores] = useState([]);
  const [permissoesPorColaborador, setPermissoesPorColaborador] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await financeiroApi.permissoes.list();
      setColaboradores(data.colaboradores);
      setPermissoesPorColaborador(indexByColaborador(data.permissoes));
    } catch (error) {
      toast({ title: 'Nao foi possivel carregar as permissoes', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function papelDe(colaboradorId, modulo) {
    return permissoesPorColaborador[colaboradorId]?.[modulo] || 'usuario';
  }

  async function handleChange(colaboradorId, modulo, papel) {
    const savingKey = `${colaboradorId}:${modulo}`;
    setSavingKey(savingKey);
    try {
      await financeiroApi.permissoes.set(colaboradorId, modulo, papel);
      setPermissoesPorColaborador((current) => ({
        ...current,
        [colaboradorId]: { ...current[colaboradorId], [modulo]: papel },
      }));
      toast({ title: 'Permissao atualizada' });
    } catch (error) {
      toast({ title: 'Nao foi possivel atualizar a permissao', description: error.message });
    } finally {
      setSavingKey(null);
    }
  }

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
          <Loader2 className="h-4 w-4 animate-spin" />
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
                    {MODULOS_ATIVOS.map((modulo) => {
                      const key = `${colaborador.colaborador_id}:${modulo.key}`;
                      return (
                        <TableCell key={modulo.key} className="max-w-[220px]">
                          {isSystemAdmin ? (
                            <span className="text-xs text-muted-foreground">Acesso total</span>
                          ) : (
                            <Select
                              value={papelDe(colaborador.colaborador_id, modulo.key)}
                              disabled={savingKey === key}
                              onValueChange={(value) => handleChange(colaborador.colaborador_id, modulo.key, value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PAPEIS_MODULO.map((papel) => (
                                  <SelectItem key={papel.value} value={papel.value}>
                                    {papel.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      );
                    })}
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
    </div>
  );
}
