import { systemAccessApi as baseSystemAccessApi } from '@macom/api-client/systemAccessApi';

export const systemAccessApi = {
  ...baseSystemAccessApi,
  systems: {
    ...baseSystemAccessApi.systems,
    list: () => baseSystemAccessApi.systems.list({ appContext: 'central' }),
  },
  accesses: {
    ...baseSystemAccessApi.accesses,
    list: () => baseSystemAccessApi.accesses.list({ appContext: 'central' }),
    save: (payload) => baseSystemAccessApi.accesses.save(payload, { appContext: 'central' }),
    update: (id, payload) => baseSystemAccessApi.accesses.update(id, payload, { appContext: 'central' }),
    remove: (id) => baseSystemAccessApi.accesses.remove(id, { appContext: 'central' }),
  },
};
