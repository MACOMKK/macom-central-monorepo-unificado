import { intranetApi } from '@macom/api-client/intranetApi';

import { assertSupabaseConfigured, supabase } from '@/api/supabaseClient';

const DOCUMENT_STORAGE_BUCKET = 'documentos';
const ANNOUNCEMENT_IMAGE_STORAGE_BUCKET = 'avisos';
const ALLOWED_ANNOUNCEMENT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_ANNOUNCEMENT_IMAGE_FILE_SIZE = 2 * 1024 * 1024;
const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024;

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

async function uploadToBucket(file, bucket, maxFileSize) {
  assertSupabaseConfigured();

  if (Number.isFinite(file?.size) && file.size > maxFileSize) {
    throw new Error(`O arquivo deve ter no maximo ${Math.floor(maxFileSize / (1024 * 1024))} MB.`);
  }

  const fileExt = file.name.split('.').pop();
  const filePath = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    throw normalizeFunctionError(uploadError, 'Falha ao enviar arquivo.');
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return {
    publicUrl: data.publicUrl,
    filePath,
  };
}

async function uploadFile(file) {
  const { publicUrl, filePath } = await uploadToBucket(
    file,
    DOCUMENT_STORAGE_BUCKET,
    MAX_DOCUMENT_FILE_SIZE,
  );
  return {
    file_url: publicUrl,
    file_path: filePath,
    file_name: file.name,
    file_type: file.type || null,
    file_size: Number.isFinite(file.size) ? file.size : null,
  };
}

async function uploadAnnouncementImage(file) {
  if (file?.type && !ALLOWED_ANNOUNCEMENT_IMAGE_TYPES.has(file.type)) {
    throw new Error('Formato de imagem não suportado. Use JPG, PNG ou WebP.');
  }

  const { publicUrl, filePath } = await uploadToBucket(
    file,
    ANNOUNCEMENT_IMAGE_STORAGE_BUCKET,
    MAX_ANNOUNCEMENT_IMAGE_FILE_SIZE,
  );
  return {
    image_url: publicUrl,
    image_path: filePath,
    image_name: file.name,
    image_type: file.type || null,
    image_size: Number.isFinite(file.size) ? file.size : null,
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
      if (error) throw normalizeFunctionError(error, 'Falha ao obter sessão.');
      return data?.session ?? null;
    },

    async logout(redirectTo) {
      assertSupabaseConfigured();
      const { error } = await supabase.auth.signOut();
      if (error && !isMissingSessionError(error)) {
        throw normalizeFunctionError(error, 'Falha ao encerrar sessão.');
      }
      if (redirectTo) {
        window.location.assign(redirectTo);
      }
    },

    async clearSession() {
      assertSupabaseConfigured();
      const { error } = await supabase.auth.signOut();
      if (error && !isMissingSessionError(error)) {
        throw normalizeFunctionError(error, 'Falha ao limpar sessão.');
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
    uploadAnnouncementImage,
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

