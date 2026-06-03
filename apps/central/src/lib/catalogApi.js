import { catalogApi as baseCatalogApi } from '@macom/api-client/catalogApi';

import { invokeCentralApi } from '@/lib/centralApiClient';

const listCentralEntity = async (entity) => {
  const result = await invokeCentralApi('list', { entity });
  return result.rows || [];
};

const buildCentralEntity = (entity) => ({
  list: () => listCentralEntity(entity),
  create: async (payload) => {
    const result = await invokeCentralApi('create', { entity, payload });
    return result.row || null;
  },
  update: async (id, payload) => {
    const result = await invokeCentralApi('update', { entity, id, payload });
    return result.row || null;
  },
  remove: async (id) => {
    await invokeCentralApi('delete', { entity, id });
    return true;
  },
});

export const catalogApi = {
  ...baseCatalogApi,
  departamentos: {
    ...baseCatalogApi.departamentos,
    ...buildCentralEntity('departamentos'),
  },
  unidades: {
    ...baseCatalogApi.unidades,
    ...buildCentralEntity('unidades'),
  },
  colaboradores: {
    ...baseCatalogApi.colaboradores,
    list: () => listCentralEntity('colaboradores'),
    update: async (id, payload) => {
      const result = await invokeCentralApi('update', { entity: 'colaboradores', id, payload });
      return result.row || null;
    },
  },
  contatos: {
    ...baseCatalogApi.contatos,
    ...buildCentralEntity('contatos'),
  },
  ativos: {
    ...baseCatalogApi.ativos,
    ...buildCentralEntity('ativos'),
  },
  infra_estrutura: {
    ...baseCatalogApi.infra_estrutura,
    ...buildCentralEntity('infra_estrutura'),
  },
  linhas_corporativas: {
    ...baseCatalogApi.linhas_corporativas,
    ...buildCentralEntity('linhas_corporativas'),
  },
  termos_posse: {
    ...baseCatalogApi.termos_posse,
    list: () => listCentralEntity('termos_posse'),
    create: async (payload) => {
      const result = await invokeCentralApi('generate', { entity: 'termos_posse', payload });
      return result.row || null;
    },
    update: async (id, payload) => {
      const result = await invokeCentralApi('update', { entity: 'termos_posse', id, payload });
      return result.row || null;
    },
    remove: async (id) => {
      await invokeCentralApi('delete', { entity: 'termos_posse', id });
      return true;
    },
  },
  logs_auditoria: {
    ...baseCatalogApi.logs_auditoria,
    list: async (options = {}) => {
      const result = await invokeCentralApi('list', {
        entity: 'logs_auditoria',
        filters: options.filters || {},
        limit: options.limit,
        offset: options.offset,
      });
      return {
        rows: result.rows || [],
        total: result.total ?? (result.rows || []).length,
        limit: result.limit ?? options.limit ?? null,
        offset: result.offset ?? options.offset ?? 0,
      };
    },
  },
  permissoes_central: {
    ...baseCatalogApi.permissoes_central,
    list: async (options = {}) => {
      const result = await invokeCentralApi('list', {
        entity: 'permissoes_central',
        filters: options.filters || {},
      });
      return result.rows || [];
    },
    save: async (payload) => {
      const result = await invokeCentralApi('save', { entity: 'permissoes_central', payload });
      return result.row || null;
    },
  },
};
