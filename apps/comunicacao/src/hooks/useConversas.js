import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';

export const CONVERSAS_QUERY_KEY = ['comunicacao-conversas'];

export function useConversas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CONVERSAS_QUERY_KEY,
    queryFn: () => comunicacaoApi.conversas.list(),
  });

  const startMutation = useMutation({
    mutationFn: (colaboradorId) => comunicacaoApi.conversas.start(colaboradorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSAS_QUERY_KEY });
    },
  });

  return {
    ...query,
    conversas: query.data || [],
    startConversa: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
  };
}
