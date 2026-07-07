import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';

export function mensagensQueryKey(canalId) {
  return ['comunicacao-mensagens', canalId];
}

export function useMensagens(canalId) {
  const queryClient = useQueryClient();
  const queryKey = mensagensQueryKey(canalId);

  const query = useQuery({
    queryKey,
    queryFn: () => comunicacaoApi.mensagens.list({ canalId }),
    enabled: Boolean(canalId),
  });

  const createMutation = useMutation({
    mutationFn: (conteudo) => comunicacaoApi.mensagens.create({ canalId, conteudo }),
    onSuccess: (row) => {
      if (!row) return;
      queryClient.setQueryData(queryKey, (current) => (Array.isArray(current) ? [...current, row] : [row]));
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

  return {
    ...query,
    mensagens: query.data || [],
    createMensagem: createMutation.mutateAsync,
    updateMensagem: updateMutation.mutateAsync,
    removeMensagem: removeMutation.mutateAsync,
    isSending: createMutation.isPending,
  };
}
