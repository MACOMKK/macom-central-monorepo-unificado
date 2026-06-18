const AUTH_TOKEN_KEY = 'macom_crm_local_token';
const USER_KEY = 'macom_crm_local_user';
const STORE_PREFIX = 'macom_crm_local_entity_';
const STORAGE_VERSION_KEY = 'macom_crm_local_storage_version';
const CURRENT_DATA_VERSION = 'empty-start-2026-06-18';

const initialData = {
  Lead: [],
  Evento: [],
  Cliente: [],
  HistoricoAtendimento: [],
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

function ensureStorageVersion() {
  const currentVersion = window.localStorage.getItem(STORAGE_VERSION_KEY);

  if (currentVersion === CURRENT_DATA_VERSION) {
    return;
  }

  Object.keys(initialData).forEach((entityName) => {
    window.localStorage.removeItem(`${STORE_PREFIX}${entityName}`);
  });
  window.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_DATA_VERSION);
}

function getCollection(entityName) {
  ensureStorageVersion();
  const rows = readJson(`${STORE_PREFIX}${entityName}`, initialData[entityName] || []);

  if (entityName === 'Evento') {
    return rows.map((row) => ({
      ...row,
      telefone_normalizado: row.telefone_normalizado || normalizePhone(row.telefone),
      status: row.status === 'agendado' ? 'aguardando' : row.status,
      tipo_evento: row.tipo_evento || row.tipo || 'venda',
      proximo_contato: row.proximo_contato || row.data?.slice?.(0, 10) || '',
    }));
  }

  if (entityName === 'Lead' || entityName === 'Cliente') {
    return rows.map((row) => ({
      ...row,
      telefone_normalizado: row.telefone_normalizado || normalizePhone(row.telefone),
      email_normalizado: row.email_normalizado || normalizeEmail(row.email),
      empresa: row.empresa === 'Todas' ? 'Macom Ananindeua' : row.empresa,
    }));
  }

  return rows;
}

function setCollection(entityName, rows) {
  writeJson(`${STORE_PREFIX}${entityName}`, rows);
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function requireNormalizedPhone(phone, context) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error(`${context} deve ter telefone.`);
  }
  return normalized;
}

function normalizeEmail(email) {
  return normalizeText(email);
}

function upsertCliente(payload) {
  const clientes = getCollection('Cliente');
  const phone = requireNormalizedPhone(payload.telefone, 'Cliente');
  const email = normalizeEmail(payload.email);
  const nome = normalizeText(payload.nome || payload.cliente_nome);
  const empresa = payload.empresa || 'Macom Ananindeua';

  const existing = clientes.find((cliente) => {
    const clientePhone = cliente.telefone_normalizado || normalizePhone(cliente.telefone);
    const clienteEmail = cliente.email_normalizado || normalizeEmail(cliente.email);
    const samePhone = clientePhone === phone;
    const sameEmail = email && clienteEmail === email;
    return samePhone || sameEmail;
  });

  const now = new Date().toISOString();
  const base = {
    nome: payload.nome || payload.cliente_nome || existing?.nome || '',
    telefone: payload.telefone || existing?.telefone || '',
    telefone_normalizado: phone,
    email: payload.email || existing?.email || '',
    email_normalizado: email || existing?.email_normalizado || '',
    empresa,
    status_relacionamento: payload.status_relacionamento || existing?.status_relacionamento || 'lead',
    updated_date: now,
  };

  if (existing) {
    const updated = { ...existing, ...base };
    setCollection('Cliente', clientes.map((cliente) => (cliente.id === existing.id ? updated : cliente)));
    return updated;
  }

  const created = {
    id: createId('Cliente'),
    created_date: now,
    ...base,
  };
  setCollection('Cliente', [created, ...clientes]);
  return created;
}

function updateCliente(id, data) {
  const clientes = getCollection('Cliente');
  const current = clientes.find((cliente) => cliente.id === id);

  if (!current) {
    throw new Error('Cliente nao encontrado.');
  }

  const phone = requireNormalizedPhone(data.telefone ?? current.telefone, 'Cliente');
  const email = normalizeEmail(data.email ?? current.email);

  const duplicated = clientes.find((cliente) => {
    if (cliente.id === id) return false;
    const samePhone = (cliente.telefone_normalizado || normalizePhone(cliente.telefone)) === phone;
    const sameEmail = email && (cliente.email_normalizado || normalizeEmail(cliente.email)) === email;
    return samePhone || sameEmail;
  });

  if (duplicated) {
    throw new Error('Ja existe outro cliente com este telefone ou e-mail.');
  }

  const updated = {
    ...current,
    ...data,
    telefone_normalizado: phone,
    email_normalizado: email,
    updated_date: new Date().toISOString(),
  };

  setCollection('Cliente', clientes.map((cliente) => (cliente.id === id ? updated : cliente)));

  addHistoricoAtendimento({
    cliente_id: id,
    tipo: 'observacao',
    descricao: 'Cadastro do cliente atualizado.',
    entidade: 'Cliente',
    entidade_id: id,
    status: updated.status_relacionamento,
  });

  return updated;
}

function addHistoricoAtendimento(entry) {
  const now = new Date().toISOString();
  const next = {
    id: createId('HistoricoAtendimento'),
    created_date: now,
    ...entry,
  };
  setCollection('HistoricoAtendimento', [next, ...getCollection('HistoricoAtendimento')]);
  return next;
}

const ACTIVE_LEAD_STATUSES = new Set(['novo', 'em_atendimento']);
const OPEN_ATTENDANCE_STATUSES = new Set(['aguardando', 'andamento']);

function findActiveLeadForCliente(clienteId, telefoneNormalizado, ignoredLeadId) {
  return getCollection('Lead').find((lead) => (
    (lead.cliente_id === clienteId || lead.telefone_normalizado === telefoneNormalizado) &&
    lead.id !== ignoredLeadId &&
    ACTIVE_LEAD_STATUSES.has(lead.status)
  ));
}

function findOpenAttendanceForLead(leadId, ignoredAttendanceId) {
  if (!leadId) return null;

  return getCollection('Evento').find((evento) => (
    evento.lead_id === leadId &&
    evento.id !== ignoredAttendanceId &&
    OPEN_ATTENDANCE_STATUSES.has(evento.status)
  ));
}

function applyBusinessRules(entityName, row, previousRow = null) {
  if (entityName === 'Lead') {
    const phone = requireNormalizedPhone(row.telefone, 'Lead');
    const next = {
      ...row,
      telefone_normalizado: phone,
      email_normalizado: normalizeEmail(row.email),
    };
    const cliente = upsertCliente({
      nome: next.nome,
      telefone: next.telefone,
      email: next.email,
      empresa: next.empresa,
      status_relacionamento: next.status === 'convertido' ? 'cliente' : 'lead',
    });

    next.cliente_id = cliente.id;

    if (ACTIVE_LEAD_STATUSES.has(next.status)) {
      const activeLead = findActiveLeadForCliente(cliente.id, next.telefone_normalizado, next.id);

      if (activeLead) {
        throw new Error('Ja existe um lead ativo para este cliente.');
      }
    }

    if (!previousRow) {
      addHistoricoAtendimento({
        cliente_id: cliente.id,
        tipo: 'entrada_lead',
        descricao: `Lead criado na central: ${next.nome}`,
        entidade: 'Lead',
        entidade_id: next.id,
        status: next.status,
      });
    }

    if (next.status === 'convertido') {
      next.convertido_em = next.convertido_em || new Date().toISOString();

      if (previousRow?.status !== 'convertido') {
        addHistoricoAtendimento({
          cliente_id: cliente.id,
          tipo: 'conversao_lead',
          descricao: `Lead convertido em cliente: ${next.nome}`,
          entidade: 'Lead',
          entidade_id: next.id,
          status: next.status,
        });
      }
    }

    return next;
  }

  if (entityName === 'Evento') {
    const lead = row.lead_id ? getCollection('Lead').find((item) => item.id === row.lead_id) : null;

    if (row.lead_id && !lead) {
      throw new Error('Lead vinculado ao atendimento nao foi encontrado.');
    }

    const inherited = lead ? {
      cliente_nome: lead.nome,
      telefone: lead.telefone,
      empresa: lead.empresa,
      origem: lead.origem,
      modelo_interesse: lead.modelo_interesse,
      cliente_id: lead.cliente_id,
    } : {};
    const merged = { ...row, ...inherited };
    const phone = requireNormalizedPhone(merged.telefone, 'Atendimento');
    const cliente = upsertCliente({
      nome: merged.cliente_nome,
      telefone: merged.telefone,
      email: lead?.email,
      empresa: merged.empresa,
      status_relacionamento: merged.status === 'sucesso' ? 'cliente' : 'lead',
    });

    const next = { ...merged, telefone_normalizado: phone, cliente_id: cliente.id };

    if (OPEN_ATTENDANCE_STATUSES.has(next.status)) {
      const openAttendance = findOpenAttendanceForLead(next.lead_id, next.id);

      if (openAttendance) {
        throw new Error('Este lead ja possui um atendimento em aberto.');
      }
    }

    if (!previousRow && lead && lead.status === 'novo') {
      setCollection('Lead', getCollection('Lead').map((item) => (
        item.id === lead.id
          ? { ...item, status: 'em_atendimento', updated_date: new Date().toISOString() }
          : item
      )));
      next.status_lead_anterior = 'novo';
    }

    if (!previousRow || previousRow.status !== next.status) {
      addHistoricoAtendimento({
        cliente_id: cliente.id,
        tipo: 'atendimento',
        descricao: `${next.titulo || 'Atendimento'} - ${next.status}`,
        entidade: 'Evento',
        entidade_id: next.id,
        lead_id: next.lead_id,
        status: next.status,
      });
    }

    return next;
  }

  return row;
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
      const next = applyBusinessRules(entityName, {
        id: createId(entityName),
        created_date: now,
        updated_date: now,
        ...data,
      });
      setCollection(entityName, [next, ...getCollection(entityName)]);
      return next;
    },

    async update(id, data) {
      const rows = getCollection(entityName);
      const updated = rows.map((row) => {
        if (row.id !== id) return row;
        return applyBusinessRules(
          entityName,
          { ...row, ...data, updated_date: new Date().toISOString() },
          row,
        );
      });
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
    Cliente: {
      ...createRepository('Cliente'),
      update: updateCliente,
    },
    Evento: createRepository('Evento'),
    HistoricoAtendimento: createRepository('HistoricoAtendimento'),
    Lead: createRepository('Lead'),
  },
};
