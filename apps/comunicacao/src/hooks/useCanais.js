import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';

export const CANAIS_QUERY_KEY = ['comunicacao-canais'];

export function useCanais() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CANAIS_QUERY_KEY,
    queryFn: () => comunicacaoApi.canais.list(),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => comunicacaoApi.canais.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CANAIS_QUERY_KEY });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (canalId) => comunicacaoApi.canais.archive(canalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CANAIS_QUERY_KEY });
    },
  });

  const joinMutation = useMutation({
    mutationFn: (canalId) => comunicacaoApi.canais.join(canalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CANAIS_QUERY_KEY });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (canalId) => comunicacaoApi.canais.leave(canalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CANAIS_QUERY_KEY });
    },
  });

  return {
    ...query,
    createCanal: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    archiveCanal: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
    joinCanal: joinMutation.mutateAsync,
    isJoining: joinMutation.isPending,
    leaveCanal: leaveMutation.mutateAsync,
    isLeaving: leaveMutation.isPending,
  };
}
