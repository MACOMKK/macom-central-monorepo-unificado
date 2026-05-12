import { assertSupabaseConfigured, supabase } from './supabaseClient';

async function invokeCatalogFunction(action, payload = {}) {
  assertSupabaseConfigured();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/catalog-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload ? { action, ...payload } : { action }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || 'Falha ao consultar acessos dos sistemas.');
  }

  return result;
}

export const systemAccessApi = {
  systems: {
    async list() {
      const result = await invokeCatalogFunction('list', { entity: 'sistemas' });
      return result.rows || [];
    },
    async findBySlug(slug) {
      const rows = await this.list();
      return rows.find((system) => system.slug === slug) || null;
    },
  },
  accesses: {
    async list() {
      const result = await invokeCatalogFunction('list', { entity: 'acessos_usuario_sistema' });
      return result.rows || [];
    },
    async save(payload) {
      const result = await invokeCatalogFunction('save', { entity: 'acessos_usuario_sistema', payload });
      return result.row || null;
    },
    async update(id, payload) {
      const result = await invokeCatalogFunction('update', { entity: 'acessos_usuario_sistema', id, payload });
      return result.row || null;
    },
    async findByCollaboratorAndSystem(colaboradorId, systemSlug) {
      void colaboradorId;
      const result = await invokeCatalogFunction('access_check', {
        entity: 'acessos_usuario_sistema',
        system_slug: systemSlug,
      });
      return result.row || null;
    },
    async remove(id) {
      await invokeCatalogFunction('delete', { entity: 'acessos_usuario_sistema', id });
      return true;
    },
  },
};
