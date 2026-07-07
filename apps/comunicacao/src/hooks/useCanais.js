import { useQuery } from '@tanstack/react-query';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';

export const CANAIS_QUERY_KEY = ['comunicacao-canais'];

export function useCanais() {
  return useQuery({
    queryKey: CANAIS_QUERY_KEY,
    queryFn: () => comunicacaoApi.canais.list(),
  });
}
