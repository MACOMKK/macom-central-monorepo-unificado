import { catalogApi as baseCatalogApi } from '@macom/api-client/catalogApi';

export const catalogApi = {
  ...baseCatalogApi,
  colaboradores: {
    ...baseCatalogApi.colaboradores,
    list: () => baseCatalogApi.colaboradores.list({ appContext: 'central' }),
  },
};
