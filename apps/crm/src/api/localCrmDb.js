import { crmApi } from '@macom/api-client/crmApi';
import { supabase, assertSupabaseConfigured } from '@macom/api-client/supabaseClient';

const ACTIVE_LEAD_STATUSES = new Set(['novo', 'em_atendimento']);

const SORT_KEY_MAP = {
  created_date: 'criado_em',
  updated_date: 'atualizado_em',
  tipo_evento: 'tipo_atendimento',
};

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeEmail(email) {
  return normalizeText(email);
}

function requireNormalizedPhone(phone, context) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error(`${context} deve ter telefone.`);
  }
  return normalized;
}

function toError(error, fallbackMessage) {
  if (!error) return new Error(fallbackMessage);

  const message = String(error.message || fallbackMessage);
  const normalized = message.toLowerCase();

  if (normalized.includes('idx_crm_leads_cliente_ativo_unique')) {
    return new Error('Ja existe um lead ativo para este cliente.');
  }

  if (normalized.includes('idx_crm_atendimentos_lead_aberto_unique')) {
    return new Error('Este lead ja possui um atendimento em aberto.');
  }

  if (normalized.includes('idx_crm_clientes_telefone_unique')) {
    return new Error('Ja existe outro cliente com este telefone.');
  }

  if (normalized.includes('idx_crm_clientes_email_unique')) {
    return new Error('Ja existe outro cliente com este e-mail.');
  }

  const err = new Error(message);
  err.status = error.status || 500;
  err.details = error;
  return err;
}

function parseSort(orderBy = '-created_date') {
  const descending = String(orderBy).startsWith('-');
  const rawField = String(orderBy).replace(/^-/, '');
  return {
    field: SORT_KEY_MAP[rawField] || rawField,
    ascending: !descending,
  };
}

function mapBaseDates(row = {}) {
  return {
    created_date: row.criado_em || row.created_date || null,
    updated_date: row.atualizado_em || row.updated_date || null,
  };
}

function mapClienteRow(row = {}) {
  return {
    id: row.id,
    nome: row.nome || '',
    telefone: row.telefone || '',
    telefone_normalizado: row.telefone_normalizado || normalizePhone(row.telefone),
    email: row.email || '',
    email_normalizado: row.email_normalizado || normalizeEmail(row.email),
    empresa: row.empresa || 'Macom Ananindeua',
    status_relacionamento: row.status_relacionamento || 'lead',
    observacoes: row.observacoes || '',
    ...mapBaseDates(row),
  };
}

function mapLeadRow(row = {}) {
  return {
    id: row.id,
    cliente_id: row.cliente_id || '',
    nome: row.nome || '',
    telefone: row.telefone || '',
    telefone_normalizado: row.telefone_normalizado || normalizePhone(row.telefone),
    email: row.email || '',
    email_normalizado: row.email_normalizado || normalizeEmail(row.email),
    origem: row.origem || 'site',
    status: row.status || 'novo',
    modelo_interesse: row.modelo_interesse || '',
    empresa: row.empresa || 'Macom Ananindeua',
    convertido_em: row.convertido_em || null,
    perdido_em: row.perdido_em || null,
    motivo_perda: row.motivo_perda || '',
    ...mapBaseDates(row),
  };
}

function mapEventoRow(row = {}) {
  const lead = row.lead || row.leads || {};
  const cliente = row.cliente || row.clientes || {};

  return {
    id: row.id,
    lead_id: row.lead_id || '',
    cliente_id: row.cliente_id || '',
    cliente_nome: cliente.nome || lead.nome || row.cliente_nome || '',
    telefone: cliente.telefone || lead.telefone || row.telefone || '',
    telefone_normalizado: cliente.telefone_normalizado || lead.telefone_normalizado || row.telefone_normalizado || '',
    titulo: row.titulo || '',
    status: row.status || 'aguardando',
    tipo_evento: row.tipo_atendimento || row.tipo_evento || 'venda',
    temperatura: row.temperatura || 'morno',
    origem: lead.origem || row.origem || '',
    empresa: lead.empresa || cliente.empresa || row.empresa || 'Macom Ananindeua',
    modelo_interesse: lead.modelo_interesse || row.modelo_interesse || '',
    proximo_contato: row.proximo_contato || '',
    observacoes: row.observacoes || '',
    ...mapBaseDates(row),
  };
}

function mapHistoricoRow(row = {}) {
  return {
    id: row.id,
    cliente_id: row.cliente_id || '',
    lead_id: row.lead_id || '',
    atendimento_id: row.atendimento_id || row.entidade_id || '',
    tipo: row.tipo || '',
    descricao: row.descricao || '',
    entidade: row.entidade || '',
    entidade_id: row.entidade_id || row.atendimento_id || row.lead_id || '',
    status: row.status || '',
    metadados: row.metadados || {},
    created_date: row.criado_em || null,
  };
}

function mapClientePayload(data = {}) {
  const phone = requireNormalizedPhone(data.telefone, 'Cliente');
  const email = normalizeEmail(data.email);

  return {
    nome: data.nome || data.cliente_nome || '',
    telefone: data.telefone || '',
    telefone_normalizado: phone,
    email: data.email || null,
    email_normalizado: email || null,
    empresa: data.empresa || 'Macom Ananindeua',
    status_relacionamento: data.status_relacionamento || 'lead',
    observacoes: data.observacoes || null,
  };
}

function mapLeadPayload(data = {}, clienteId) {
  const phone = requireNormalizedPhone(data.telefone, 'Lead');
  const email = normalizeEmail(data.email);

  return {
    cliente_id: clienteId || data.cliente_id,
    nome: data.nome || '',
    telefone: data.telefone || '',
    telefone_normalizado: phone,
    email: data.email || null,
    email_normalizado: email || null,
    origem: data.origem || 'site',
    status: data.status || 'novo',
    modelo_interesse: data.modelo_interesse || null,
    empresa: data.empresa || 'Macom Ananindeua',
    convertido_em: data.status === 'convertido'
      ? (data.convertido_em || new Date().toISOString())
      : (data.convertido_em || null),
    perdido_em: data.status === 'perdido'
      ? (data.perdido_em || new Date().toISOString())
      : (data.perdido_em || null),
    motivo_perda: data.motivo_perda || null,
  };
}

function mapEventoPayload(data = {}, lead) {
  return {
    lead_id: data.lead_id,
    cliente_id: lead?.cliente_id || data.cliente_id,
    titulo: data.titulo || '',
    status: data.status || 'aguardando',
    tipo_atendimento: data.tipo_evento || data.tipo_atendimento || 'venda',
    temperatura: data.temperatura || 'morno',
    proximo_contato: data.proximo_contato || null,
    observacoes: data.observacoes || null,
  };
}

async function addHistoricoAtendimento(entry) {
  const payload = {
    cliente_id: entry.cliente_id,
    lead_id: entry.lead_id || null,
    atendimento_id: entry.atendimento_id || (entry.entidade === 'Evento' ? entry.entidade_id : null),
    tipo: entry.tipo,
    descricao: entry.descricao,
    entidade: entry.entidade || null,
    entidade_id: entry.entidade_id || null,
    status: entry.status || null,
    metadados: entry.metadados || {},
  };

  const row = await crmApi.historico_atendimentos.create(payload);
  return mapHistoricoRow(row);
}

async function findClienteByContact({ telefone, email }) {
  const phone = normalizePhone(telefone);
  const normalizedEmail = normalizeEmail(email);
  const filters = [`telefone_normalizado.eq.${phone}`];

  if (normalizedEmail) {
    filters.push(`email_normalizado.eq.${normalizedEmail}`);
  }

  const rows = await crmApi.clientes.list({
    or: filters.join(','),
    limit: 1,
  });
  return rows?.[0] || null;
}

async function upsertCliente(data = {}) {
  const payload = mapClientePayload(data);
  const existing = await findClienteByContact(payload);

  if (existing) {
    const row = await crmApi.clientes.update(existing.id, {
      ...payload,
      nome: payload.nome || existing.nome,
      email: payload.email || existing.email,
      email_normalizado: payload.email_normalizado || existing.email_normalizado,
      status_relacionamento: payload.status_relacionamento || existing.status_relacionamento,
    });
    return mapClienteRow(row);
  }

  const row = await crmApi.clientes.create(payload);
  return mapClienteRow(row);
}

async function getLead(id) {
  const row = await crmApi.leads.getById(id);
  return mapLeadRow(row);
}

function createListRepository(entityName, entityApi, mapper) {

  return {
    async list(orderBy = '-created_date', limit = 100) {
      const parsed = parseSort(orderBy);
      const rows = await entityApi.list({
        orderBy: parsed.field,
        ascending: parsed.ascending,
        limit,
      });
      return rows.map(mapper);
    },

    async delete(id) {
      return entityApi.remove(id);
    },
  };
}

const ClienteRepository = {
  ...createListRepository('Cliente', crmApi.clientes, mapClienteRow),

  async create(data) {
    return upsertCliente(data);
  },

  async update(id, data) {
    const payload = mapClientePayload(data);
    const row = await crmApi.clientes.update(id, payload);

    await addHistoricoAtendimento({
      cliente_id: id,
      tipo: 'observacao',
      descricao: 'Cadastro do cliente atualizado.',
      entidade: 'Cliente',
      entidade_id: id,
      status: row.status_relacionamento,
    });

    return mapClienteRow(row);
  },
};

const LeadRepository = {
  ...createListRepository('Lead', crmApi.leads, mapLeadRow),

  async create(data) {
    const cliente = await upsertCliente({
      nome: data.nome,
      telefone: data.telefone,
      email: data.email,
      empresa: data.empresa,
      status_relacionamento: data.status === 'convertido' ? 'cliente' : 'lead',
    });
    const payload = mapLeadPayload(data, cliente.id);
    const row = await crmApi.leads.create(payload);
    const lead = mapLeadRow(row);

    await addHistoricoAtendimento({
      cliente_id: lead.cliente_id,
      lead_id: lead.id,
      tipo: 'entrada_lead',
      descricao: `Lead criado na central: ${lead.nome}`,
      entidade: 'Lead',
      entidade_id: lead.id,
      status: lead.status,
    });

    return lead;
  },

  async update(id, data) {
    const current = await getLead(id);
    const nextData = { ...current, ...data };
    const cliente = await upsertCliente({
      nome: nextData.nome,
      telefone: nextData.telefone,
      email: nextData.email,
      empresa: nextData.empresa,
      status_relacionamento: nextData.status === 'convertido' ? 'cliente' : 'lead',
    });
    const payload = mapLeadPayload(nextData, cliente.id);
    const row = await crmApi.leads.update(id, payload);
    const lead = mapLeadRow(row);

    if (lead.status === 'convertido' && current.status !== 'convertido') {
      await addHistoricoAtendimento({
        cliente_id: lead.cliente_id,
        lead_id: lead.id,
        tipo: 'conversao_lead',
        descricao: `Lead convertido em cliente: ${lead.nome}`,
        entidade: 'Lead',
        entidade_id: lead.id,
        status: lead.status,
      });
    }

    return lead;
  },
};

const EventoRepository = {
  ...createListRepository('Evento', crmApi.atendimentos, mapEventoRow),

  async create(data) {
    if (!data.lead_id) {
      throw new Error('Atendimento deve estar vinculado a um lead.');
    }

    const lead = await getLead(data.lead_id);
    const payload = mapEventoPayload(data, lead);
    const row = await crmApi.atendimentos.create(payload);
    const evento = mapEventoRow(row);

    if (lead.status === 'novo' && ACTIVE_LEAD_STATUSES.has('em_atendimento')) {
      await crmApi.leads.update(lead.id, { status: 'em_atendimento' });
    }

    await addHistoricoAtendimento({
      cliente_id: evento.cliente_id,
      lead_id: evento.lead_id,
      atendimento_id: evento.id,
      tipo: 'atendimento',
      descricao: `${evento.titulo || 'Atendimento'} - ${evento.status}`,
      entidade: 'Evento',
      entidade_id: evento.id,
      status: evento.status,
    });

    return evento;
  },

  async update(id, data) {
    const lead = data.lead_id ? await getLead(data.lead_id) : null;
    const payload = mapEventoPayload(data, lead);
    const row = await crmApi.atendimentos.update(id, payload);
    const evento = mapEventoRow(row);

    await addHistoricoAtendimento({
      cliente_id: evento.cliente_id,
      lead_id: evento.lead_id,
      atendimento_id: evento.id,
      tipo: 'atendimento',
      descricao: `${evento.titulo || 'Atendimento'} - ${evento.status}`,
      entidade: 'Evento',
      entidade_id: evento.id,
      status: evento.status,
    });

    return evento;
  },
};

const HistoricoAtendimentoRepository = createListRepository(
  'HistoricoAtendimento',
  crmApi.historico_atendimentos,
  mapHistoricoRow,
);

export const localCrmDb = {
  auth: {
    async me() {
      assertSupabaseConfigured();
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session || null;
      if (error || !session?.user || !session?.access_token) {
        const authError = toError(error, 'Authentication required');
        authError.status = 401;
        throw authError;
      }
      return crmApi.auth.me(session.access_token);
    },

    async login(email, password) {
      assertSupabaseConfigured();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw toError(error, 'Nao foi possivel entrar.');
      return data.user;
    },

    async loginWithProvider(provider = 'google', redirectTo = '/') {
      assertSupabaseConfigured();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}${redirectTo}` },
      });
      if (error) throw toError(error, 'Nao foi possivel iniciar login.');
    },

    async register({ email, password }) {
      assertSupabaseConfigured();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw toError(error, 'Nao foi possivel criar usuario.');
      return { ok: true };
    },

    async verifyOtp({ email, otpCode }) {
      assertSupabaseConfigured();
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
      if (error) throw toError(error, 'Codigo invalido.');
      return { access_token: data?.session?.access_token };
    },

    async resendOtp(email) {
      assertSupabaseConfigured();
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw toError(error, 'Nao foi possivel reenviar codigo.');
      return { ok: true };
    },

    async resetPassword({ newPassword }) {
      assertSupabaseConfigured();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw toError(error, 'Nao foi possivel redefinir senha.');
      return { ok: true };
    },

    async resetPasswordRequest(email) {
      assertSupabaseConfigured();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw toError(error, 'Nao foi possivel enviar recuperacao.');
      return { ok: true };
    },

    setToken() {
      return null;
    },

    async logout(redirectUrl) {
      assertSupabaseConfigured();
      await supabase.auth.signOut();
      if (redirectUrl) {
        window.location.href = '/entrar';
      }
    },

    redirectToLogin() {
      window.location.href = '/entrar';
    },
  },

  entities: {
    Cliente: ClienteRepository,
    Evento: EventoRepository,
    HistoricoAtendimento: HistoricoAtendimentoRepository,
    Lead: LeadRepository,
  },
};
