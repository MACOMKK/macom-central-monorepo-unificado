import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';
import { useAuth } from '@/lib/AuthContext';
import { updateMensagemReacoes } from './reacoesUtils';

export function mensagensQueryKey(canalId) {
  return ['comunicacao-mensagens', canalId];
}

export function useMensagens(canalId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = mensagensQueryKey(canalId);

  const query = useQuery({
    queryKey,
    queryFn: () => comunicacaoApi.mensagens.list({ canalId }),
    enabled: Boolean(canalId),
  });

  const createMutation = useMutation({
    mutationFn: ({ conteudo, anexos, respostaAId, mencoes }) =>
      comunicacaoApi.mensagens.create({ canalId, conteudo, anexos, respostaAId, mencoes }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic = {
        id: tempId,
        canal_id: canalId,
        conteudo: variables.conteudo,
        autor_id: user?.id,
        autor: user ? { id: user.id, nome: user.nome } : null,
        criado_em: new Date().toISOString(),
        editada_em: null,
        excluida_em: null,
        anexos: (variables.anexos || []).map((anexo, index) => ({ id: `${tempId}-anexo-${index}`, ...anexo })),
        reacoes: [],
        resposta_a: null,
        _pending: true,
      };
      queryClient.setQueryData(queryKey, (current) => (Array.isArray(current) ? [...current, optimistic] : [optimistic]));
      return { tempId };
    },
    onError: (_error, _variables, context) => {
      if (!context?.tempId) return;
      queryClient.setQueryData(queryKey, (current) =>
        Array.isArray(current)
          ? current.map((item) => (item.id === context.tempId ? { ...item, _pending: false, _failed: true } : item))
          : current,
      );
    },
    onSuccess: (row, _variables, context) => {
      if (!row) return;
      queryClient.setQueryData(queryKey, (current) => {
        const base = Array.isArray(current) ? current : [];
        const withoutTemp = context?.tempId ? base.filter((item) => item.id !== context.tempId) : base;
        const exists = withoutTemp.some((item) => item.id === row.id);
        return exists ? withoutTemp.map((item) => (item.id === row.id ? { ...item, ...row } : item)) : [...withoutTemp, row];
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, conteudo }) => comunicacaoApi.mensagens.update(id, conteudo),
    onSuccess: (row) => {
      if (!row) return;
      queryClient.setQueryData(queryKey, (current) =>
        Array.isArray(current) ? current.map((item) => (item.id === row.id ? { ...item, ...row } : item)) : current,
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => comunicacaoApi.mensagens.remove(id),
    onSuccess: (row) => {
      if (!row) return;
      queryClient.setQueryData(queryKey, (current) =>
        Array.isArray(current) ? current.map((item) => (item.id === row.id ? { ...item, ...row } : item)) : current,
      );
    },
  });

  const toggleReacaoMutation = useMutation({
    mutationFn: ({ mensagemId, emoji }) => comunicacaoApi.reacoes.toggle({ mensagemId, emoji }),
    onMutate: async ({ mensagemId, emoji }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      const atual = previous?.find((item) => item.id === mensagemId);
      const action = atual?.reacoes?.find((r) => r.emoji === emoji)?.reagiu ? 'removed' : 'added';
      queryClient.setQueryData(queryKey, (current) =>
        updateMensagemReacoes(current, mensagemId, { emoji, colaboradorId: user?.id, currentUserId: user?.id, action }),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
  });

  const removeLocalMensagem = (id) => {
    queryClient.setQueryData(queryKey, (current) => (Array.isArray(current) ? current.filter((item) => item.id !== id) : current));
  };

  return {
    ...query,
    mensagens: query.data || [],
    createMensagem: createMutation.mutateAsync,
    updateMensagem: updateMutation.mutateAsync,
    removeMensagem: removeMutation.mutateAsync,
    removeLocalMensagem,
    toggleReacao: toggleReacaoMutation.mutateAsync,
    isSending: createMutation.isPending,
  };
}
