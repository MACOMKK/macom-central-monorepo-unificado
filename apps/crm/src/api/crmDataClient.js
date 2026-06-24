import { crmApi } from '@macom/api-client/crmApi';

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

function normalizeDateOnly(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || '';
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
    return new Error('Este lead ja possui uma atividade planejada.');
  }

  if (normalized.includes('idx_crm_atendimentos_lead_planejada_unique')) {
    return new Error('Este lead ja possui uma atividade planejada.');
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
  const slaDeadline = row.sla_primeiro_contato_em || null;
  const firstContact = row.primeiro_contato_em || null;
  const slaAlertMinutes = Number(row.sla_alerta_minutos ?? 10);
  const deadlineTime = slaDeadline ? new Date(slaDeadline).getTime() : null;
  const remainingMinutes = deadlineTime
    ? Math.ceil((deadlineTime - Date.now()) / 60000)
    : null;
  const slaStatus = firstContact
    ? 'concluido'
    : deadlineTime && deadlineTime < Date.now()
      ? 'atrasado'
      : remainingMinutes !== null && remainingMinutes <= slaAlertMinutes
        ? 'alerta'
      : 'no_prazo';

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
    responsavel_id: row.responsavel_id || '',
    responsavel: row.responsavel || null,
    responsavel_nome: row.responsavel?.nome || '',
    unidade_id: row.unidade_id || row.responsavel?.unidade_id || '',
    atribuido_em: row.atribuido_em || null,
    primeiro_contato_em: firstContact,
    sla_primeiro_contato_em: slaDeadline,
    sla_primeiro_contato_minutos: Number(row.sla_primeiro_contato_minutos ?? 30),
    sla_alerta_minutos: slaAlertMinutes,
    sla_minutos_restantes: remainingMinutes,
    sla_status: slaStatus,
    previsao_fechamento: normalizeDateOnly(row.previsao_fechamento),
    observacoes: row.observacoes || '',
    ...mapBaseDates(row),
  };
}

function mapEventoRow(row = {}) {
  const lead = row.lead || row.leads || {};
  const cliente = row.cliente || row.clientes || {};
  const responsavel = row.responsavel || lead.responsavel || null;
  const legacyStatusMap = {
    aguardando: 'planejada',
    andamento: 'planejada',
    concluido: 'concluida',
    cancelado: 'cancelada',
    sucesso: 'concluida',
    insucesso: 'concluida',
  };
  const normalizedStatus = legacyStatusMap[row.status] || row.status || 'planejada';
  const normalizedResult = row.resultado
    || (row.status === 'sucesso' ? 'contato_realizado' : '')
    || (row.status === 'insucesso' ? 'sem_resposta' : '');

  return {
    id: row.id,
    lead_id: row.lead_id || '',
    cliente_id: row.cliente_id || '',
    cliente_nome: cliente.nome || lead.nome || row.cliente_nome || '',
    telefone: cliente.telefone || lead.telefone || row.telefone || '',
    telefone_normalizado: cliente.telefone_normalizado || lead.telefone_normalizado || row.telefone_normalizado || '',
    titulo: row.titulo || '',
    status: normalizedStatus,
    tipo_evento: row.tipo_atendimento || row.tipo_evento || 'ligacao',
    temperatura: row.temperatura || 'morno',
    origem: lead.origem || row.origem || '',
    empresa: lead.empresa || cliente.empresa || row.empresa || 'Macom Ananindeua',
    modelo_interesse: lead.modelo_interesse || row.modelo_interesse || '',
    responsavel_id: lead.responsavel_id || row.responsavel_id || '',
    responsavel,
    responsavel_nome: responsavel?.nome || '',
    proximo_contato: normalizeDateOnly(row.proximo_contato),
    observacoes: row.observacoes || '',
    resultado: normalizedResult,
    motivo_resultado: row.motivo_resultado || '',
    concluido_em: row.concluido_em || null,
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

  if (data.status === 'perdido' && !String(data.motivo_perda || '').trim()) {
    throw new Error('Informe o motivo da perda para encerrar este lead.');
  }

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
    motivo_perda: data.status === 'perdido' ? String(data.motivo_perda).trim() : null,
    responsavel_id: data.responsavel_id || null,
    unidade_id: data.unidade_id || null,
    previsao_fechamento: data.previsao_fechamento || null,
    observacoes: data.observacoes || null,
  };
}

function mapEventoPayload(data = {}, lead) {
  if (data.status === 'concluida' && !data.resultado) {
    throw new Error('Informe o resultado para concluir a atividade.');
  }

  if (data.status === 'concluida' && data.resultado === 'lead_perdido' && !String(data.motivo_resultado || '').trim()) {
    throw new Error('Informe o motivo da perda para concluir a atividade.');
  }

  return {
    lead_id: data.lead_id,
    cliente_id: lead?.cliente_id || data.cliente_id,
    titulo: data.titulo || '',
    status: data.status || 'planejada',
    tipo_atendimento: data.tipo_evento || data.tipo_atendimento || 'ligacao',
    temperatura: data.temperatura || 'morno',
    proximo_contato: data.proximo_contato || null,
    observacoes: data.observacoes || null,
    resultado: data.status === 'concluida' ? (data.resultado || null) : null,
    motivo_resultado: data.status === 'concluida' && data.resultado === 'lead_perdido'
      ? String(data.motivo_resultado || '').trim()
      : null,
  };
}

function isTerminalActivityResult(result) {
  return ['venda_realizada', 'lead_perdido'].includes(result);
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

    async listPage(options = {}) {
      const parsed = parseSort(options.orderBy || '-created_date');
      const result = await entityApi.listPage({
        ...options,
        orderBy: parsed.field,
        ascending: parsed.ascending,
        limit: options.limit || options.pageSize || 50,
      });

      return {
        ...result,
        rows: result.rows.map(mapper),
      };
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

    return lead;
  },
};

const ResponsavelRepository = {
  async list() {
    return crmApi.responsaveis.list();
  },
};

const DistribuicaoRepository = {
  async getConfig() {
    return crmApi.distribuicao.getConfig();
  },
  async saveConfig(data) {
    return crmApi.distribuicao.saveConfig(data);
  },
  async clearTestData() {
    return crmApi.distribuicao.clearTestData();
  },
};

const EventoRepository = {
  ...createListRepository('Evento', crmApi.atendimentos, mapEventoRow),

  async create(data) {
    if (!data.lead_id) {
      throw new Error('Atividade deve estar vinculada a um lead.');
    }

    const lead = await getLead(data.lead_id);
    const payload = mapEventoPayload(data, lead);
    const row = await crmApi.atendimentos.create(payload);
    const evento = mapEventoRow(row);

    await addHistoricoAtendimento({
      cliente_id: evento.cliente_id,
      lead_id: evento.lead_id,
      atendimento_id: evento.id,
      tipo: 'atendimento',
      descricao: `${evento.titulo || 'Atividade'} - ${evento.status}`,
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
      descricao: `${evento.titulo || 'Atividade'} - ${evento.status}`,
      entidade: 'Evento',
      entidade_id: evento.id,
      status: evento.status,
    });

    if (
      data.status === 'concluida'
      && data.resultado
      && !isTerminalActivityResult(data.resultado)
      && data.proxima_atividade?.titulo
      && data.proxima_atividade?.proximo_contato
    ) {
      const nextPayload = mapEventoPayload({
        lead_id: evento.lead_id,
        cliente_id: evento.cliente_id,
        titulo: data.proxima_atividade.titulo,
        status: 'planejada',
        tipo_evento: data.proxima_atividade.tipo_evento || 'ligacao',
        temperatura: data.temperatura || evento.temperatura || 'morno',
        proximo_contato: data.proxima_atividade.proximo_contato,
        observacoes: data.proxima_atividade.observacoes || null,
      }, lead);
      const nextRow = await crmApi.atendimentos.create(nextPayload);
      const nextEvento = mapEventoRow(nextRow);

      await addHistoricoAtendimento({
        cliente_id: nextEvento.cliente_id,
        lead_id: nextEvento.lead_id,
        atendimento_id: nextEvento.id,
        tipo: 'atendimento',
        descricao: `Proxima atividade planejada: ${nextEvento.titulo}`,
        entidade: 'Evento',
        entidade_id: nextEvento.id,
        status: nextEvento.status,
      });
    }

    return evento;
  },
};

const HistoricoAtendimentoRepository = createListRepository(
  'HistoricoAtendimento',
  crmApi.historico_atendimentos,
  mapHistoricoRow,
);

export const crmDataClient = {
  entities: {
    Cliente: ClienteRepository,
    Evento: EventoRepository,
    Atividade: EventoRepository,
    HistoricoAtendimento: HistoricoAtendimentoRepository,
    Lead: LeadRepository,
    Responsavel: ResponsavelRepository,
    Distribuicao: DistribuicaoRepository,
  },
};
