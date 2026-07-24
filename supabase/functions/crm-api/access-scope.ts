export const CRM_SCHEMA = 'gestao_crm';

export type EntityName = 'clientes' | 'leads' | 'atendimentos' | 'historico_atendimentos' | 'veiculos_interesse';

export function getAccessLevel(access: Record<string, unknown> | null) {
  return String(access?.nivel_acesso || '');
}

export function buildAccessScope(
  entity: EntityName,
  access: Record<string, unknown> | null,
  collaborator: Record<string, unknown> | null,
  startIndex: number,
) {
  const level = getAccessLevel(access);
  if (level === 'admin') return { clause: '', values: [] as unknown[] };

  const collaboratorId = String(collaborator?.id || '');
  const unitId = String(collaborator?.unidade_id || '');
  if (!collaboratorId) {
    throw Object.assign(new Error('Colaborador nao identificado.'), { status: 403 });
  }

  if (level === 'gestor') {
    if (!unitId) {
      throw Object.assign(new Error('Gestor sem unidade vinculada.'), { status: 403 });
    }
    if (entity === 'leads') {
      return { clause: `l."unidade_id" = $${startIndex}`, values: [unitId] };
    }
    if (entity === 'atendimentos') {
      return { clause: `l."unidade_id" = $${startIndex}`, values: [unitId] };
    }
    if (entity === 'clientes') {
      return {
        clause: `(
          "criado_por" = $${startIndex + 1}
          or exists (
            select 1 from ${CRM_SCHEMA}.leads scope_lead
            where scope_lead.cliente_id = clientes.id
              and scope_lead.unidade_id = $${startIndex}
          )
        )`,
        values: [unitId, collaboratorId],
      };
    }
    if (entity === 'historico_atendimentos') {
      return {
        clause: `(
          exists (
            select 1 from ${CRM_SCHEMA}.leads scope_lead
            where scope_lead.id = historico_atendimentos.lead_id
              and scope_lead.unidade_id = $${startIndex}
          )
          or exists (
            select 1 from ${CRM_SCHEMA}.leads scope_lead
            where scope_lead.cliente_id = historico_atendimentos.cliente_id
              and scope_lead.unidade_id = $${startIndex}
          )
        )`,
        values: [unitId],
      };
    }
    if (entity === 'veiculos_interesse') {
      return {
        clause: `exists (
          select 1 from ${CRM_SCHEMA}.leads scope_lead
          where scope_lead.id = veiculos_interesse.lead_id
            and scope_lead.unidade_id = $${startIndex}
        )`,
        values: [unitId],
      };
    }
  }

  if (entity === 'leads') {
    return {
      clause: `(l."responsavel_id" = $${startIndex} or l."criado_por" = $${startIndex})`,
      values: [collaboratorId],
    };
  }
  if (entity === 'atendimentos') {
    return {
      clause: `(l."responsavel_id" = $${startIndex} or a."criado_por" = $${startIndex})`,
      values: [collaboratorId],
    };
  }
  if (entity === 'clientes') {
    return {
      clause: `(
        "criado_por" = $${startIndex}
        or exists (
          select 1 from ${CRM_SCHEMA}.leads scope_lead
          where scope_lead.cliente_id = clientes.id
            and (scope_lead.responsavel_id = $${startIndex} or scope_lead.criado_por = $${startIndex})
        )
      )`,
      values: [collaboratorId],
    };
  }
  if (entity === 'historico_atendimentos') {
    return {
      clause: `(
        exists (
          select 1 from ${CRM_SCHEMA}.leads scope_lead
          where scope_lead.id = historico_atendimentos.lead_id
            and (scope_lead.responsavel_id = $${startIndex} or scope_lead.criado_por = $${startIndex})
        )
        or exists (
          select 1 from ${CRM_SCHEMA}.leads scope_lead
          where scope_lead.cliente_id = historico_atendimentos.cliente_id
            and (scope_lead.responsavel_id = $${startIndex} or scope_lead.criado_por = $${startIndex})
        )
      )`,
      values: [collaboratorId],
    };
  }
  if (entity === 'veiculos_interesse') {
    return {
      clause: `exists (
        select 1 from ${CRM_SCHEMA}.leads scope_lead
        where scope_lead.id = veiculos_interesse.lead_id
          and (scope_lead.responsavel_id = $${startIndex} or scope_lead.criado_por = $${startIndex})
      )`,
      values: [collaboratorId],
    };
  }

  return { clause: '', values: [] as unknown[] };
}
