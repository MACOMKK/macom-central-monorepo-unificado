import { useQuery } from '@tanstack/react-query';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';

export function useBuscaMensagens({ query, canalId, conversaId } = {}) {
  const termo = (query || '').trim();

  return useQuery({
    queryKey: ['comunicacao-busca-mensagens', termo, canalId || null, conversaId || null],
    queryFn: () => comunicacaoApi.busca.mensagens({ query: termo, canalId, conversaId }),
    enabled: termo.length >= 2,
  });
}
