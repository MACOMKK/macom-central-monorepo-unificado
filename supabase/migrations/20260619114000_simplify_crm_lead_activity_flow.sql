alter table gestao_crm.leads
  drop constraint if exists leads_status_check;

update gestao_crm.leads
set status = 'em_contato'
where status = 'em_atendimento';

alter table gestao_crm.leads
  add constraint leads_status_check
  check (status in (
    'novo',
    'tentativa_contato',
    'em_contato',
    'qualificado',
    'proposta',
    'convertido',
    'perdido'
  ));

drop index if exists gestao_crm.idx_crm_leads_cliente_ativo_unique;
create unique index idx_crm_leads_cliente_ativo_unique
  on gestao_crm.leads (cliente_id)
  where status in ('novo', 'tentativa_contato', 'em_contato', 'qualificado', 'proposta');

drop index if exists gestao_crm.idx_crm_leads_sla_primeiro_contato;
create index idx_crm_leads_sla_primeiro_contato
  on gestao_crm.leads (sla_primeiro_contato_em)
  where primeiro_contato_em is null
    and status in ('novo', 'tentativa_contato', 'em_contato', 'qualificado', 'proposta');

drop trigger if exists trg_crm_atendimentos_first_contact on gestao_crm.atendimentos;
drop trigger if exists trg_crm_guard_open_attendance on gestao_crm.atendimentos;
drop trigger if exists trg_crm_attendance_business_state on gestao_crm.atendimentos;
drop trigger if exists trg_crm_attendance_outcome on gestao_crm.atendimentos;

alter table gestao_crm.atendimentos
  drop constraint if exists atendimentos_status_check;

update gestao_crm.atendimentos
set status = case
  when status in ('aguardando', 'andamento') then 'planejada'
  when status = 'concluido' then 'concluida'
  when status = 'cancelado' then 'cancelada'
  else status
end;

alter table gestao_crm.atendimentos
  add constraint atendimentos_status_check
  check (status in ('planejada', 'concluida', 'cancelada'));

alter table gestao_crm.atendimentos
  alter column status set default 'planejada';

alter table gestao_crm.atendimentos
  drop constraint if exists atendimentos_tipo_atendimento_check;

alter table gestao_crm.atendimentos
  add constraint atendimentos_tipo_atendimento_check
  check (tipo_atendimento in (
    'ligacao', 'whatsapp', 'email', 'visita', 'test_drive', 'tarefa',
    'venda', 'pos_venda', 'agendamento', 'retorno'
  ));

alter table gestao_crm.atendimentos
  alter column tipo_atendimento set default 'ligacao';

drop index if exists gestao_crm.idx_crm_atendimentos_lead_aberto_unique;
create unique index idx_crm_atendimentos_lead_planejada_unique
  on gestao_crm.atendimentos (lead_id)
  where status = 'planejada';

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
      and active_lead.status in ('novo', 'tentativa_contato', 'em_contato', 'qualificado', 'proposta')
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

create or replace function gestao_crm.prepare_activity_business_state()
returns trigger
language plpgsql
security definer
set search_path = gestao_crm, public
as $$
declare
  linked_client_id uuid;
begin
  select cliente_id
  into linked_client_id
  from gestao_crm.leads
  where id = new.lead_id;

  if linked_client_id is null then
    raise exception using
      errcode = '23503',
      message = 'Lead vinculado a atividade nao foi encontrado.';
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

create or replace function gestao_crm.apply_activity_outcome()
returns trigger
language plpgsql
security definer
set search_path = gestao_crm, public
as $$
begin
  if new.status <> 'concluida' then
    return new;
  end if;

  update gestao_crm.leads
  set primeiro_contato_em = case
    when new.resultado <> 'sem_resposta' then coalesce(primeiro_contato_em, now())
    else primeiro_contato_em
  end
  where id = new.lead_id;

  if new.resultado = 'venda_realizada' then
    update gestao_crm.leads
    set status = 'convertido', convertido_em = coalesce(convertido_em, now())
    where id = new.lead_id;

    update gestao_crm.clientes
    set status_relacionamento = 'cliente'
    where id = new.cliente_id;
  elsif new.resultado = 'lead_perdido' then
    update gestao_crm.leads
    set status = 'perdido', motivo_perda = new.motivo_resultado, perdido_em = coalesce(perdido_em, now())
    where id = new.lead_id;
  elsif new.resultado = 'proposta_enviada' then
    update gestao_crm.leads set status = 'proposta'
    where id = new.lead_id and status in ('novo', 'tentativa_contato', 'em_contato', 'qualificado', 'proposta');
  elsif new.resultado in ('visita_agendada', 'test_drive') then
    update gestao_crm.leads set status = 'qualificado'
    where id = new.lead_id and status in ('novo', 'tentativa_contato', 'em_contato', 'qualificado');
  elsif new.resultado = 'contato_realizado' then
    update gestao_crm.leads set status = 'em_contato'
    where id = new.lead_id and status in ('novo', 'tentativa_contato');
  elsif new.resultado = 'sem_resposta' then
    update gestao_crm.leads set status = 'tentativa_contato'
    where id = new.lead_id and status = 'novo';
  end if;

  return new;
end;
$$;

create or replace function gestao_crm.prevent_activity_when_lead_has_planned_one()
returns trigger
language plpgsql
security definer
set search_path = gestao_crm, public
as $$
begin
  if exists (
    select 1
    from gestao_crm.atendimentos existing
    where existing.lead_id = new.lead_id
      and existing.status = 'planejada'
  ) then
    raise exception using
      errcode = '23505',
      message = 'Este lead ja possui uma atividade planejada.';
  end if;

  return new;
end;
$$;

create trigger trg_crm_activity_business_state
before insert or update on gestao_crm.atendimentos
for each row execute function gestao_crm.prepare_activity_business_state();

create trigger trg_crm_activity_guard_planned
before insert on gestao_crm.atendimentos
for each row execute function gestao_crm.prevent_activity_when_lead_has_planned_one();

create trigger trg_crm_activity_outcome
after insert or update of status, resultado, motivo_resultado on gestao_crm.atendimentos
for each row execute function gestao_crm.apply_activity_outcome();

grant execute on function gestao_crm.prepare_activity_business_state() to authenticated, service_role;
grant execute on function gestao_crm.apply_activity_outcome() to authenticated, service_role;
grant execute on function gestao_crm.prevent_activity_when_lead_has_planned_one() to authenticated, service_role;

notify pgrst, 'reload schema';
