import { intranetApi } from '@macom/api-client/intranetApi';

import { assertSupabaseConfigured, supabase } from '@/api/supabaseClient';

const STORAGE_BUCKET = 'documents';

function normalizeFunctionError(error, fallbackMessage) {
  if (!error) {
    return new Error(fallbackMessage);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(error.message || fallbackMessage);
}

function isMissingSessionError(error) {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('auth session missing');
}

async function uploadFile(file) {
  assertSupabaseConfigured();

  const fileExt = file.name.split('.').pop();
  const filePath = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    throw normalizeFunctionError(uploadError, 'Falha ao enviar arquivo.');
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return {
    file_url: data.publicUrl,
    file_path: filePath,
    file_name: file.name,
    file_type: file.type || null,
    file_size: Number.isFinite(file.size) ? file.size : null,
  };
}

function buildEntityApi(entityName) {
  return {
    list(orderBy, limit) {
      return intranetApi.entities[entityName].list(orderBy, limit);
    },

    filter(filters, orderBy, limit) {
      return intranetApi.entities[entityName].filter(filters, orderBy, limit);
    },

    create(payload) {
      return intranetApi.entities[entityName].create(payload);
    },

    update(id, payload) {
      return intranetApi.entities[entityName].update(id, payload);
    },

    async delete(id) {
      return intranetApi.entities[entityName].delete(id);
    },
  };
}

export const appClient = {
  auth: {
    me() {
      return intranetApi.auth.me();
    },

    async signIn({ email, password }) {
      assertSupabaseConfigured();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw normalizeFunctionError(error, 'Falha ao entrar.');
      return intranetApi.auth.me(data?.session?.access_token);
    },

    async getSession() {
      assertSupabaseConfigured();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw normalizeFunctionError(error, 'Falha ao obter sessao.');
      return data?.session ?? null;
    },

    async logout(redirectTo) {
      assertSupabaseConfigured();
      const { error } = await supabase.auth.signOut();
      if (error && !isMissingSessionError(error)) {
        throw normalizeFunctionError(error, 'Falha ao encerrar sessao.');
      }
      if (redirectTo) {
        window.location.assign(redirectTo);
      }
    },

    async clearSession() {
      assertSupabaseConfigured();
      const { error } = await supabase.auth.signOut();
      if (error && !isMissingSessionError(error)) {
        throw normalizeFunctionError(error, 'Falha ao limpar sessao.');
      }
    },

    redirectToLogin(redirectTo) {
      const params = new URLSearchParams();
      if (redirectTo) {
        params.set('redirectTo', redirectTo);
      }
      window.location.assign(`/login${params.toString() ? `?${params.toString()}` : ''}`);
    },

    onAuthStateChange(callback) {
      assertSupabaseConfigured();
      return supabase.auth.onAuthStateChange(callback);
    },
  },

  storage: {
    uploadFile,
  },

  catalogs: {
    listDepartments() {
      return intranetApi.catalogs.listDepartments();
    },

    listUnits() {
      return intranetApi.catalogs.listUnits();
    },
  },

  entities: new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== 'string') return undefined;
        return buildEntityApi(prop);
      },
    }
  ),
};

