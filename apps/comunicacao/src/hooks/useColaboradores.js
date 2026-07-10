import { useQuery } from '@tanstack/react-query';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';

export function useColaboradores(search, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['comunicacao-colaboradores', search],
    queryFn: () => comunicacaoApi.colaboradores.list({ search }),
    enabled,
  });
}
