import { useQuery } from '@tanstack/react-query';

import { financeiroApi } from '@macom/api-client/financeiroApi';

const CATALOGO_STALE_TIME = 5 * 60 * 1000;

export function useCategorias({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['servicos', 'categorias'],
    queryFn: () => financeiroApi.categorias.list(),
    staleTime: CATALOGO_STALE_TIME,
    enabled,
  });
}

export function useEmpresas({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['servicos', 'empresas'],
    queryFn: () => financeiroApi.empresas.list(),
    staleTime: CATALOGO_STALE_TIME,
    enabled,
  });
}

// Combina os 5 catalogos usados pelo formulario de nova solicitacao numa unica
// chamada de rede (action list_catalogos_solicitacao), em vez de 5 requests
// paralelos independentes — cada um pagava o overhead de autenticacao da Edge
// Function separadamente.
export function useCatalogosSolicitacao({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['servicos', 'catalogos-solicitacao'],
    queryFn: () => financeiroApi.catalogosSolicitacao.list(),
    staleTime: CATALOGO_STALE_TIME,
    enabled,
  });
}
