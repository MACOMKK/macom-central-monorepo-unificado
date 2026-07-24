-- Etapa de pre-lead (triagem): contatos entram em status 'triagem' e so
-- passam a contar como lead oficial (distribuicao automatica + SLA) quando
-- promovidos para um status ativo do funil. 'descartado' e o status terminal
-- para pre-leads sem potencial real de compra.

alter table gestao_crm.leads
  drop constraint if exists leads_status_check;

alter table gestao_crm.leads
  add constraint leads_status_check
  check (status in (
    'triagem',
    'novo',
    'tentativa_contato',
    'em_contato',
    'qualificado',
    'proposta',
    'convertido',
    'perdido',
    'descartado'
  ));

alter table gestao_crm.leads
  add column if not exists motivo_descarte text,
  add column if not exists promovido_em timestamptz;

drop index if exists gestao_crm.idx_crm_leads_cliente_ativo_unique;
create unique index idx_crm_leads_cliente_ativo_unique
  on gestao_crm.leads (cliente_id)
  where status in ('novo', 'tentativa_contato', 'em_contato', 'qualificado', 'proposta');

create unique index if not exists idx_crm_leads_cliente_triagem_unique
  on gestao_crm.leads (cliente_id)
  where status = 'triagem';

drop index if exists gestao_crm.idx_crm_leads_sla_primeiro_contato;
create index idx_crm_leads_sla_primeiro_contato
  on gestao_crm.leads (sla_primeiro_contato_em)
  where primeiro_contato_em is null
    and status in ('novo', 'tentativa_contato', 'em_contato', 'qualificado', 'proposta');

create or replace function gestao_crm.prepare_lead_phase1()
returns trigger
language plpgsql
security definer
set search_path = gestao_crm, public
as $$
declare
  assigned_collaborator_id uuid;
  distribution_config gestao_crm.configuracoes_distribuicao%rowtype;
  manual_responsavel_unidade_id uuid;
  sla_minutes integer := 30;
  leaving_triagem boolean;
begin
  leaving_triagem := tg_op = 'UPDATE' and old.status = 'triagem' and new.status <> 'triagem';

  if new.status = 'perdido' and nullif(trim(coalesce(new.motivo_perda, '')), '') is null then
    raise exception using errcode = '23514', message = 'Motivo da perda e obrigatorio para leads perdidos.';
  end if;

  if new.status <> 'perdido' then
    new.motivo_perda = null;
    new.perdido_em = null;
  elsif new.perdido_em is null then
    new.perdido_em = now();
  end if;

  if new.status = 'descartado' and nullif(trim(coalesce(new.motivo_descarte, '')), '') is null then
    raise exception using errcode = '23514', message = 'Motivo do descarte e obrigatorio para pre-leads descartados.';
  end if;

  if new.status <> 'descartado' then
    new.motivo_descarte = null;
  end if;

  if new.status = 'convertido' and new.convertido_em is null then
    new.convertido_em = now();
  elsif new.status <> 'convertido' then
    new.convertido_em = null;
  end if;

  if leaving_triagem and new.promovido_em is null then
    new.promovido_em = now();
  end if;

  if new.unidade_id is null then
    select u.id into new.unidade_id
    from public.unidades u
    where (lower(new.empresa) like '%ananindeua%' and lower(u.nome) like '%ananindeua%')
       or (lower(new.empresa) like '%bel%' and lower(u.nome) like '%bel%')
       or (lower(new.empresa) like '%paragominas%' and lower(u.nome) like '%paragominas%')
    order by u.nome
    limit 1;
  end if;

  if new.unidade_id is null then
    raise exception using errcode = '23514', message = 'Unidade do lead e obrigatoria para distribuicao.';
  end if;

  -- Enquanto em triagem, o pre-lead ainda nao participa da distribuicao
  -- automatica nem do SLA de primeiro contato do funil oficial.
  if new.status = 'triagem' then
    if tg_op = 'INSERT' then
      new.atribuido_em = case when new.responsavel_id is null then null else now() end;
      new.sla_primeiro_contato_em = null;
    end if;
    return new;
  end if;

  select * into distribution_config
  from gestao_crm.configuracoes_distribuicao
  where unidade_id = new.unidade_id;

  sla_minutes = coalesce(distribution_config.sla_primeiro_contato_minutos, 30);

  if new.responsavel_id is not null then
    select c.unidade_id into manual_responsavel_unidade_id
    from public.colaboradores c
    join public.acessos_usuario_sistema aus on aus.colaborador_id = c.id and aus.ativo = true
    join public.sistemas s on s.id = aus.sistema_id and s.slug = 'crm' and s.ativo = true
    where c.id = new.responsavel_id and c.status <> 'inativo';

    if manual_responsavel_unidade_id is null or manual_responsavel_unidade_id <> new.unidade_id then
      raise exception using errcode = '23514', message = 'Responsavel deve possuir acesso ao CRM e pertencer a unidade do lead.';
    end if;
  end if;

  if (tg_op = 'INSERT' or leaving_triagem) and new.responsavel_id is null then
    perform pg_advisory_xact_lock(hashtextextended(new.unidade_id::text, 0));

    if distribution_config.ativa then
      if distribution_config.estrategia = 'rodizio' then
        select vd.colaborador_id into assigned_collaborator_id
        from gestao_crm.vendedores_distribuicao vd
        join public.colaboradores c on c.id = vd.colaborador_id
        left join gestao_crm.leads active_lead
          on active_lead.responsavel_id = vd.colaborador_id
         and active_lead.status in ('novo', 'tentativa_contato', 'em_contato', 'qualificado', 'proposta')
        where vd.unidade_id = new.unidade_id and vd.ativo and c.status <> 'inativo'
        group by vd.colaborador_id, vd.ultimo_lead_atribuido_em, vd.limite_leads_ativos
        having count(active_lead.id) < coalesce(vd.limite_leads_ativos, distribution_config.limite_padrao_leads_ativos, 2147483647)
        order by vd.ultimo_lead_atribuido_em nulls first, vd.colaborador_id
        limit 1;
      else
        select vd.colaborador_id into assigned_collaborator_id
        from gestao_crm.vendedores_distribuicao vd
        join public.colaboradores c on c.id = vd.colaborador_id
        left join gestao_crm.leads active_lead
          on active_lead.responsavel_id = vd.colaborador_id
         and active_lead.status in ('novo', 'tentativa_contato', 'em_contato', 'qualificado', 'proposta')
        where vd.unidade_id = new.unidade_id and vd.ativo and c.status <> 'inativo'
        group by vd.colaborador_id, vd.ultimo_lead_atribuido_em, vd.limite_leads_ativos
        having count(active_lead.id) < coalesce(vd.limite_leads_ativos, distribution_config.limite_padrao_leads_ativos, 2147483647)
        order by count(active_lead.id), vd.ultimo_lead_atribuido_em nulls first, vd.colaborador_id
        limit 1;
      end if;

      if assigned_collaborator_id is null then
        raise exception using errcode = '23514', message = 'Nenhum vendedor elegivel para receber o lead nesta unidade.';
      end if;

      new.responsavel_id = assigned_collaborator_id;
      update gestao_crm.vendedores_distribuicao
      set ultimo_lead_atribuido_em = now()
      where unidade_id = new.unidade_id and colaborador_id = assigned_collaborator_id;
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.atribuido_em = case when new.responsavel_id is null then null else now() end;
  elsif new.responsavel_id is distinct from old.responsavel_id then
    new.atribuido_em = case when new.responsavel_id is null then null else now() end;
  end if;

  if new.sla_primeiro_contato_em is null then
    new.sla_primeiro_contato_em = coalesce(new.promovido_em, new.criado_em, now()) + make_interval(mins => sla_minutes);
  end if;

  return new;
end;
$$;

grant execute on function gestao_crm.prepare_lead_phase1() to authenticated, service_role;

-- Impede registrar atividade comercial em um lead que ainda esta em triagem
-- (pre-lead precisa ser promovido antes de receber atendimentos).
create or replace function gestao_crm.prepare_activity_business_state()
returns trigger
language plpgsql
security definer
set search_path = gestao_crm, public
as $$
declare
  linked_client_id uuid;
  linked_lead_status text;
begin
  select cliente_id, status
  into linked_client_id, linked_lead_status
  from gestao_crm.leads
  where id = new.lead_id;

  if linked_client_id is null then
    raise exception using
      errcode = '23503',
      message = 'Lead vinculado a atividade nao foi encontrado.';
  end if;

  if linked_lead_status = 'triagem' then
    raise exception using
      errcode = '23514',
      message = 'Promova o pre-lead antes de registrar atividades.';
  end if;

  new.cliente_id = linked_client_id;

  if tg_op = 'UPDATE'
     and old.status in ('concluida', 'cancelada')
     and new.status is distinct from old.status then
    raise exception using
      errcode = '23514',
      message = 'Atividade encerrada nao pode ser reaberta.';
  end if;

  if new.status = 'planejada' then
    if new.proximo_contato is null then
      raise exception using
        errcode = '23514',
        message = 'Informe a data da atividade planejada.';
    end if;

    new.resultado = null;
    new.motivo_resultado = null;
    new.concluido_em = null;
  elsif new.status = 'cancelada' then
    new.resultado = null;
    new.motivo_resultado = null;
    new.concluido_em = coalesce(new.concluido_em, now());
  elsif new.status = 'concluida' then
    if new.resultado is null then
      raise exception using
        errcode = '23514',
        message = 'Informe o resultado para concluir a atividade.';
    end if;

    if new.resultado = 'lead_perdido'
       and nullif(trim(coalesce(new.motivo_resultado, '')), '') is null then
      raise exception using
        errcode = '23514',
        message = 'Informe o motivo da perda para concluir a atividade.';
    end if;

    if new.resultado <> 'lead_perdido' then
      new.motivo_resultado = null;
    end if;

    new.concluido_em = coalesce(new.concluido_em, now());
  end if;

  return new;
end;
$$;

grant execute on function gestao_crm.prepare_activity_business_state() to authenticated, service_role;

alter table gestao_crm.historico_atendimentos
  drop constraint if exists historico_atendimentos_tipo_check;

alter table gestao_crm.historico_atendimentos
  add constraint historico_atendimentos_tipo_check
  check (tipo in (
    'entrada_lead',
    'atendimento',
    'conversao_lead',
    'observacao',
    'atualizacao_lead',
    'atribuicao_lead',
    'promocao_lead',
    'descarte_lead'
  ));

create or replace function gestao_crm.register_lead_change_history()
returns trigger
language plpgsql
security definer
set search_path = gestao_crm, public
as $$
declare
  history_type text;
  history_description text;
begin
  if old.status = 'triagem' and new.status <> 'triagem' and new.status <> 'descartado' then
    history_type = 'promocao_lead';
    history_description = 'Pre-lead promovido a lead oficial.';
  elsif new.status = 'descartado' and old.status is distinct from new.status then
    history_type = 'descarte_lead';
    history_description = 'Pre-lead descartado: ' || coalesce(new.motivo_descarte, '');
  elsif new.responsavel_id is distinct from old.responsavel_id then
    history_type = 'atribuicao_lead';
    history_description = case
      when new.responsavel_id is null then 'Responsavel removido do lead.'
      else 'Responsavel do lead alterado.'
    end;
  elsif new.nome is distinct from old.nome
     or new.telefone is distinct from old.telefone
     or new.email is distinct from old.email
     or new.status is distinct from old.status
     or new.modelo_interesse is distinct from old.modelo_interesse
     or new.previsao_fechamento is distinct from old.previsao_fechamento
     or new.motivo_perda is distinct from old.motivo_perda
     or new.observacoes is distinct from old.observacoes then
    history_type = 'atualizacao_lead';
    history_description = 'Dados comerciais do lead atualizados.';
  else
    return new;
  end if;

  insert into gestao_crm.historico_atendimentos (
    cliente_id,
    lead_id,
    tipo,
    descricao,
    entidade,
    entidade_id,
    status,
    metadados
  ) values (
    new.cliente_id,
    new.id,
    history_type,
    history_description,
    'Lead',
    new.id,
    new.status,
    jsonb_build_object(
      'antes', to_jsonb(old),
      'depois', to_jsonb(new)
    )
  );

  return new;
end;
$$;

grant execute on function gestao_crm.register_lead_change_history() to authenticated, service_role;

notify pgrst, 'reload schema';
