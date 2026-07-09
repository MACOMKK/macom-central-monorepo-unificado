import { useQueryClient } from '@tanstack/react-query';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';
import { CANAIS_QUERY_KEY } from './useCanais';
import { CONVERSAS_QUERY_KEY } from './useConversas';

function zerarNaoLidas(queryClient, queryKey, id) {
  queryClient.setQueryData(queryKey, (current) =>
    Array.isArray(current) ? current.map((item) => (item.id === id ? { ...item, nao_lidas: 0 } : item)) : current,
  );
}

export function useMarcarLida() {
  const queryClient = useQueryClient();

  const marcarCanalLido = (canalId) => {
    if (!canalId) return;
    zerarNaoLidas(queryClient, CANAIS_QUERY_KEY, canalId);
    comunicacaoApi.leituras.marcar({ canalId }).catch(() => {});
  };

  const marcarConversaLida = (conversaId) => {
    if (!conversaId) return;
    zerarNaoLidas(queryClient, CONVERSAS_QUERY_KEY, conversaId);
    comunicacaoApi.leituras.marcar({ conversaId }).catch(() => {});
  };

  return { marcarCanalLido, marcarConversaLida };
}
