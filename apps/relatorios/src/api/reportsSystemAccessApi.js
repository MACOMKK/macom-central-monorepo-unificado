import { invokeReportsApi } from '@/api/reportsApiClient';

export const reportsSystemAccessApi = {
  systems: {
    async list() {
      const result = await invokeReportsApi('list', { entity: 'sistemas' });
      return result.rows || [];
    },
    async findBySlug(slug) {
      const rows = await this.list();
      return rows.find((system) => system.slug === slug) || null;
    },
  },
  accesses: {
    async list() {
      const result = await invokeReportsApi('list', { entity: 'acessos_usuario_sistema' });
      return result.rows || [];
    },
    async save(payload) {
      const result = await invokeReportsApi('save', { entity: 'acessos_usuario_sistema', payload });
      return result.row || null;
    },
    async update(id, payload) {
      const result = await invokeReportsApi('update', { entity: 'acessos_usuario_sistema', id, payload });
      return result.row || null;
    },
    async findByCollaboratorAndSystem(_colaboradorId, systemSlug, accessToken) {
      const result = await invokeReportsApi(
        'access_check',
        {
          entity: 'acessos_usuario_sistema',
          system_slug: systemSlug,
        },
        accessToken,
      );
      return result.row || null;
    },
    async remove(id) {
      await invokeReportsApi('delete', { entity: 'acessos_usuario_sistema', id });
      return true;
    },
  },
};
