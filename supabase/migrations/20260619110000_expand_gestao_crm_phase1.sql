alter table gestao_crm.leads
  add column if not exists responsavel_id uuid references public.colaboradores(id) on delete set null,
  add column if not exists atribuido_em timestamptz,
  add column if not exists primeiro_contato_em timestamptz,
  add column if not exists sla_primeiro_contato_em timestamptz,
  add column if not exists previsao_fechamento date,
  add column if not exists observacoes text;

update gestao_crm.leads
set sla_primeiro_contato_em = criado_em + interval '30 minutes'
where sla_primeiro_contato_em is null;

create index if not exists idx_crm_leads_responsavel_status
  on gestao_crm.leads (responsavel_id, status);

create index if not exists idx_crm_leads_sla_primeiro_contato
  on gestao_crm.leads (sla_primeiro_contato_em)
  where primeiro_contato_em is null and status in ('novo', 'em_atendimento');

create or replace function gestao_crm.prepare_lead_phase1()
returns trigger
language plpgsql
security definer
set search_path = gestao_crm, public
as $$
declare
  assigned_collaborator_id uuid;
begin
  if new.status = 'perdido' and nullif(trim(coalesce(new.motivo_perda, '')), '') is null then
    raise exception using
      errcode = '23514',
      message = 'Motivo da perda e obrigatorio para leads perdidos.';
  end if;

  if new.status <> 'perdido' then
    new.motivo_perda = null;
    new.perdido_em = null;
  elsif new.perdido_em is null then
    new.perdido_em = now();
  end if;

  if new.status = 'convertido' and new.convertido_em is null then
    new.convertido_em = now();
  elsif new.status <> 'convertido' then
    new.convertido_em = null;
  end if;

  if tg_op = 'INSERT' and new.responsavel_id is null then
    select c.id
    into assigned_collaborator_id
    from public.colaboradores c
    join public.acessos_usuario_sistema aus on aus.colaborador_id = c.id and aus.ativo = true
    join public.sistemas s on s.id = aus.sistema_id and s.slug = 'crm' and s.ativo = true
    left join gestao_crm.leads active_lead
      on active_lead.responsavel_id = c.id
      and active_lead.status in ('novo', 'em_atendimento')
    where c.status <> 'inativo'
    group by c.id, c.nome
    order by count(active_lead.id), max(active_lead.atribuido_em) nulls first, c.nome
    limit 1;

    new.responsavel_id = assigned_collaborator_id;
  end if;

  if tg_op = 'INSERT' then
    new.atribuido_em = case when new.responsavel_id is null then null else now() end;
  elsif new.responsavel_id is distinct from old.responsavel_id then
    new.atribuido_em = case when new.responsavel_id is null then null else now() end;
  end if;

  if new.sla_primeiro_contato_em is null then
    new.sla_primeiro_contato_em = coalesce(new.criado_em, now()) + interval '30 minutes';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_crm_leads_prepare_phase1 on gestao_crm.leads;
create trigger trg_crm_leads_prepare_phase1
before insert or update on gestao_crm.leads
for each row
execute function gestao_crm.prepare_lead_phase1();

create or replace function gestao_crm.register_first_lead_contact()
returns trigger
language plpgsql
security definer
set search_path = gestao_crm, public
as $$
begin
  update gestao_crm.leads
  set
    primeiro_contato_em = coalesce(primeiro_contato_em, now()),
    status = case when status = 'novo' then 'em_atendimento' else status end
  where id = new.lead_id;

  return new;
end;
$$;

drop trigger if exists trg_crm_atendimentos_first_contact on gestao_crm.atendimentos;
create trigger trg_crm_atendimentos_first_contact
after insert on gestao_crm.atendimentos
for each row
execute function gestao_crm.register_first_lead_contact();

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
    'atribuicao_lead'
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
  if new.responsavel_id is distinct from old.responsavel_id then
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

drop trigger if exists trg_crm_leads_change_history on gestao_crm.leads;
create trigger trg_crm_leads_change_history
after update on gestao_crm.leads
for each row
execute function gestao_crm.register_lead_change_history();

grant execute on function gestao_crm.prepare_lead_phase1() to authenticated, service_role;
grant execute on function gestao_crm.register_first_lead_contact() to authenticated, service_role;
grant execute on function gestao_crm.register_lead_change_history() to authenticated, service_role;

notify pgrst, 'reload schema';
