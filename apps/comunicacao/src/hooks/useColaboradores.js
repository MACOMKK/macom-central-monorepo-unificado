import { useQuery } from '@tanstack/react-query';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';

export function useColaboradores(search) {
  return useQuery({
    queryKey: ['comunicacao-colaboradores', search],
    queryFn: () => comunicacaoApi.colaboradores.list({ search }),
  });
}
