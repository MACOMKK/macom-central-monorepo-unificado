create index if not exists idx_crm_clientes_criado_em
  on gestao_crm.clientes (criado_em desc);

create index if not exists idx_crm_clientes_atualizado_em
  on gestao_crm.clientes (atualizado_em desc);

create index if not exists idx_crm_clientes_empresa_criado_em
  on gestao_crm.clientes (empresa, criado_em desc);

create index if not exists idx_crm_clientes_nome_lower
  on gestao_crm.clientes (lower(nome));

create index if not exists idx_crm_clientes_email_lower
  on gestao_crm.clientes (lower(email));

create index if not exists idx_crm_leads_criado_em
  on gestao_crm.leads (criado_em desc);

create index if not exists idx_crm_leads_atualizado_em
  on gestao_crm.leads (atualizado_em desc);

create index if not exists idx_crm_leads_status_criado_em
  on gestao_crm.leads (status, criado_em desc);

create index if not exists idx_crm_leads_empresa_criado_em
  on gestao_crm.leads (empresa, criado_em desc);

create index if not exists idx_crm_leads_empresa_origem_status
  on gestao_crm.leads (empresa, origem, status);

create index if not exists idx_crm_leads_unidade_responsavel_status
  on gestao_crm.leads (unidade_id, responsavel_id, status);

create index if not exists idx_crm_leads_responsavel_criado_em
  on gestao_crm.leads (responsavel_id, criado_em desc);

create index if not exists idx_crm_leads_previsao_fechamento
  on gestao_crm.leads (previsao_fechamento)
  where previsao_fechamento is not null;

create index if not exists idx_crm_leads_telefone_normalizado
  on gestao_crm.leads (telefone_normalizado);

create index if not exists idx_crm_leads_email_normalizado
  on gestao_crm.leads (email_normalizado)
  where email_normalizado is not null;

create index if not exists idx_crm_leads_nome_lower
  on gestao_crm.leads (lower(nome));

create index if not exists idx_crm_leads_modelo_interesse_lower
  on gestao_crm.leads (lower(modelo_interesse));

create index if not exists idx_crm_atendimentos_criado_em
  on gestao_crm.atendimentos (criado_em desc);

create index if not exists idx_crm_atendimentos_atualizado_em
  on gestao_crm.atendimentos (atualizado_em desc);

create index if not exists idx_crm_atendimentos_proximo_contato
  on gestao_crm.atendimentos (proximo_contato)
  where proximo_contato is not null;

create index if not exists idx_crm_atendimentos_status_criado_em
  on gestao_crm.atendimentos (status, criado_em desc);

create index if not exists idx_crm_atendimentos_status_atualizado_em
  on gestao_crm.atendimentos (status, atualizado_em desc);

create index if not exists idx_crm_atendimentos_status_proximo_criado
  on gestao_crm.atendimentos (status, proximo_contato, criado_em desc);

create index if not exists idx_crm_historico_atendimento_id_criado_em
  on gestao_crm.historico_atendimentos (atendimento_id, criado_em desc)
  where atendimento_id is not null;

create index if not exists idx_crm_historico_tipo_criado_em
  on gestao_crm.historico_atendimentos (tipo, criado_em desc);

create index if not exists idx_crm_veiculos_interesse_principal
  on gestao_crm.veiculos_interesse (lead_id, principal, criado_em);

create index if not exists idx_crm_veiculos_interesse_modelo_lower
  on gestao_crm.veiculos_interesse (lower(modelo));

create index if not exists idx_crm_veiculos_interesse_marca_lower
  on gestao_crm.veiculos_interesse (lower(marca));
