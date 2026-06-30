import { invokeCentralApi } from '@/lib/centralApiClient';

export const systemAccessApi = {
  systems: {
    list: async () => {
      const result = await invokeCentralApi('list', { entity: 'sistemas' });
      return result.rows || [];
    },
  },
  accesses: {
    list: async () => {
      const result = await invokeCentralApi('list', { entity: 'acessos_usuario_sistema' });
      return result.rows || [];
    },
  },
};
