import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';

export function mensagensDiretasQueryKey(conversaId) {
  return ['comunicacao-mensagens-diretas', conversaId];
}

export function useMensagensDiretas(conversaId) {
  const queryClient = useQueryClient();
  const queryKey = mensagensDiretasQueryKey(conversaId);

  const query = useQuery({
    queryKey,
    queryFn: () => comunicacaoApi.mensagensDiretas.list({ conversaId }),
    enabled: Boolean(conversaId),
  });

  const createMutation = useMutation({
    mutationFn: ({ conteudo, anexos }) => comunicacaoApi.mensagensDiretas.create({ conversaId, conteudo, anexos }),
    onSuccess: (row) => {
      if (!row) return;
      queryClient.setQueryData(queryKey, (current) => (Array.isArray(current) ? [...current, row] : [row]));
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

  return {
    ...query,
    mensagens: query.data || [],
    createMensagem: createMutation.mutateAsync,
    updateMensagem: updateMutation.mutateAsync,
    removeMensagem: removeMutation.mutateAsync,
    isSending: createMutation.isPending,
  };
}
