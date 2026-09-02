import { invokeReportsApi } from '@/api/reportsApiClient';

const buildReportEntity = (entity) => ({
  async list(options = {}) {
    const result = await invokeReportsApi('list', {
      entity,
      filters: options.filters || {},
      limit: options.limit,
      offset: options.offset,
    });
    return result.rows || [];
  },
  async create(payload) {
    const result = await invokeReportsApi('create', { entity, payload });
    return result.row || null;
  },
  async update(id, payload) {
    const result = await invokeReportsApi('update', { entity, id, payload });
    return result.row || null;
  },
  async remove(id) {
    await invokeReportsApi('delete', { entity, id });
    return true;
  },
});

export const reportsApi = {
  auth: {
    async me(accessToken) {
      const result = await invokeReportsApi(
        'me',
        {
          entity: 'colaboradores',
          system_slug: 'relatorios',
        },
        accessToken,
      );
      return {
        row: result.row || null,
        access: result.access || null,
        permissions: result.permissions || [],
        mustChangePassword: Boolean(result.must_change_password),
      };
    },
    async clearPasswordChangeRequired() {
      return invokeReportsApi('clear_password_change_required', { entity: 'colaboradores', system_slug: 'relatorios' });
    },
  },
  relatorios: buildReportEntity('relatorios'),
  relatorios_unidades: buildReportEntity('relatorios_unidades'),
  unidades: buildReportEntity('unidades'),
  colaboradores: {
    ...buildReportEntity('colaboradores'),
    async create() {
      throw new Error('Criacao de colaboradores usa admin-create-user.');
    },
  },
  permissoes_relatorios: buildReportEntity('permissoes_relatorios'),
  permissoes_funcoes_relatorios: {
    async list(options = {}, accessTokenOverride) {
      const result = await invokeReportsApi(
        'list',
        {
          entity: 'permissoes_funcoes_relatorios',
          filters: options.filters || {},
        },
        accessTokenOverride,
      );
      return result.rows || [];
    },
  },
  avisos_relatorios: buildReportEntity('avisos_relatorios'),
  avisos_relatorios_aceites: buildReportEntity('avisos_relatorios_aceites'),
  logs_auditoria_relatorios: {
    async list(options = {}) {
      const result = await invokeReportsApi('list', {
        entity: 'logs_auditoria_relatorios',
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
};
