import { systemAccessApi as baseSystemAccessApi } from '@macom/api-client/systemAccessApi';

import { invokeCentralApi } from '@/lib/centralApiClient';

export const systemAccessApi = {
  ...baseSystemAccessApi,
  systems: {
    ...baseSystemAccessApi.systems,
    list: async () => {
      const result = await invokeCentralApi('list', { entity: 'sistemas' });
      return result.rows || [];
    },
  },
  accesses: {
    ...baseSystemAccessApi.accesses,
    list: async () => {
      const result = await invokeCentralApi('list', { entity: 'acessos_usuario_sistema' });
      return result.rows || [];
    },
    save: async (payload) => {
      const result = await invokeCentralApi('save', { entity: 'acessos_usuario_sistema', payload });
      return result.row || null;
    },
    update: async (id, payload) => {
      const result = await invokeCentralApi('update', { entity: 'acessos_usuario_sistema', id, payload });
      return result.row || null;
    },
    remove: async (id) => {
      await invokeCentralApi('delete', { entity: 'acessos_usuario_sistema', id });
      return true;
    },
  },
};
