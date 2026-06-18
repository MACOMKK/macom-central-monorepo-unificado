const AUTH_TOKEN_KEY = 'macom_crm_local_token';
const USER_KEY = 'macom_crm_local_user';
const STORE_PREFIX = 'macom_crm_local_entity_';

const initialData = {
  Lead: [
    {
      id: 'lead-1',
      nome: 'Cliente Exemplo',
      telefone: '(11) 99999-0000',
      origem: 'site',
      modelo_interesse: 'Modelo teste',
      empresa: 'Todas',
      status: 'novo',
      created_date: new Date().toISOString(),
    },
  ],
  Evento: [
    {
      id: 'evento-1',
      titulo: 'Apresentacao CRM',
      tipo: 'reuniao',
      status: 'agendado',
      empresa: 'Todas',
      data: new Date().toISOString(),
      created_date: new Date().toISOString(),
    },
  ],
  Cliente: [],
};

function createId(entityName) {
  return `${entityName.toLowerCase()}-${crypto.randomUUID?.() || Date.now()}`;
}

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getCollection(entityName) {
  return readJson(`${STORE_PREFIX}${entityName}`, initialData[entityName] || []);
}

function setCollection(entityName, rows) {
  writeJson(`${STORE_PREFIX}${entityName}`, rows);
}

function createRepository(entityName) {
  return {
    async list(orderBy = '-created_date', limit = 100) {
      const rows = [...getCollection(entityName)];
      const descending = String(orderBy).startsWith('-');
      const field = String(orderBy).replace(/^-/, '');

      rows.sort((a, b) => {
        const left = a?.[field] || '';
        const right = b?.[field] || '';
        return descending ? String(right).localeCompare(String(left)) : String(left).localeCompare(String(right));
      });

      return rows.slice(0, limit);
    },

    async create(data) {
      const now = new Date().toISOString();
      const next = {
        id: createId(entityName),
        created_date: now,
        updated_date: now,
        ...data,
      };
      setCollection(entityName, [next, ...getCollection(entityName)]);
      return next;
    },

    async update(id, data) {
      const updated = getCollection(entityName).map((row) => (
        row.id === id
          ? { ...row, ...data, updated_date: new Date().toISOString() }
          : row
      ));
      setCollection(entityName, updated);
      return updated.find((row) => row.id === id) || null;
    },

    async delete(id) {
      setCollection(entityName, getCollection(entityName).filter((row) => row.id !== id));
      return { id };
    },
  };
}

function getStoredUser() {
  return readJson(USER_KEY, null);
}

function setSession(email = 'crm@macom.local') {
  const user = {
    id: 'local-user',
    email,
    full_name: 'Usuario CRM',
  };
  window.localStorage.setItem(AUTH_TOKEN_KEY, 'local-token');
  writeJson(USER_KEY, user);
  return user;
}

export const localCrmDb = {
  auth: {
    async me() {
      const user = getStoredUser();
      if (!user) {
        const error = new Error('Authentication required');
        error.status = 401;
        throw error;
      }
      return user;
    },

    async login(email) {
      return setSession(email);
    },

    loginWithProvider() {
      setSession();
      window.location.href = '/';
    },

    async register({ email }) {
      setSession(email);
      return { ok: true };
    },

    async verifyOtp({ email }) {
      setSession(email);
      return { access_token: 'local-token' };
    },

    async resendOtp() {
      return { ok: true };
    },

    async resetPassword() {
      return { ok: true };
    },

    async resetPasswordRequest() {
      return { ok: true };
    },

    setToken(token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    },

    logout(redirectUrl) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
      if (redirectUrl) {
        window.location.href = '/login';
      }
    },

    redirectToLogin() {
      window.location.href = '/login';
    },
  },
  entities: {
    Cliente: createRepository('Cliente'),
    Evento: createRepository('Evento'),
    Lead: createRepository('Lead'),
  },
};
