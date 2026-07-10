import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';
import { useAuth } from '@/lib/AuthContext';
import { updateMensagemReacoes } from './reacoesUtils';

export function mensagensDiretasQueryKey(conversaId) {
  return ['comunicacao-mensagens-diretas', conversaId];
}

export function useMensagensDiretas(conversaId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = mensagensDiretasQueryKey(conversaId);

  const query = useQuery({
    queryKey,
    queryFn: () => comunicacaoApi.mensagensDiretas.list({ conversaId }),
    enabled: Boolean(conversaId),
  });

  const createMutation = useMutation({
    mutationFn: ({ conteudo, anexos, respostaAId, mencoes }) =>
      comunicacaoApi.mensagensDiretas.create({ conversaId, conteudo, anexos, respostaAId, mencoes }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic = {
        id: tempId,
        conversa_id: conversaId,
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
    mutationFn: ({ id, conteudo }) => comunicacaoApi.mensagensDiretas.update(id, conteudo),
    onSuccess: (row) => {
      if (!row) return;
      queryClient.setQueryData(queryKey, (current) =>
        Array.isArray(current) ? current.map((item) => (item.id === row.id ? { ...item, ...row } : item)) : current,
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => comunicacaoApi.mensagensDiretas.remove(id),
    onSuccess: (row) => {
      if (!row) return;
      queryClient.setQueryData(queryKey, (current) =>
        Array.isArray(current) ? current.map((item) => (item.id === row.id ? { ...item, ...row } : item)) : current,
      );
    },
  });

  const toggleReacaoMutation = useMutation({
    mutationFn: ({ mensagemDiretaId, emoji }) => comunicacaoApi.reacoes.toggle({ mensagemDiretaId, emoji }),
    onMutate: async ({ mensagemDiretaId, emoji }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      const atual = previous?.find((item) => item.id === mensagemDiretaId);
      const action = atual?.reacoes?.find((r) => r.emoji === emoji)?.reagiu ? 'removed' : 'added';
      queryClient.setQueryData(queryKey, (current) =>
        updateMensagemReacoes(current, mensagemDiretaId, { emoji, colaboradorId: user?.id, currentUserId: user?.id, action }),
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
