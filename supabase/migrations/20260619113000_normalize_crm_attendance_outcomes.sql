alter table gestao_crm.atendimentos
  add column if not exists resultado text,
  add column if not exists motivo_resultado text,
  add column if not exists concluido_em timestamptz;

alter table gestao_crm.atendimentos
  drop constraint if exists atendimentos_status_check;

update gestao_crm.atendimentos
set
  resultado = case
    when status = 'sucesso' then 'contato_realizado'
    when status = 'insucesso' then 'sem_resposta'
    else resultado
  end,
  concluido_em = case
    when status in ('sucesso', 'insucesso') then coalesce(atualizado_em, criado_em, now())
    else concluido_em
  end,
  status = case
    when status in ('sucesso', 'insucesso') then 'concluido'
    else status
  end;

alter table gestao_crm.atendimentos
  add constraint atendimentos_status_check
  check (status in ('aguardando', 'andamento', 'concluido', 'cancelado'));

alter table gestao_crm.atendimentos
  add constraint atendimentos_resultado_check
  check (
    resultado is null
    or resultado in (
      'contato_realizado',
      'sem_resposta',
      'visita_agendada',
      'test_drive',
      'proposta_enviada',
      'venda_realizada',
      'lead_perdido'
    )
  );

create or replace function gestao_crm.prepare_attendance_business_state()
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
      message = 'Lead vinculado ao atendimento nao foi encontrado.';
  end if;

  new.cliente_id = linked_client_id;

  if tg_op = 'UPDATE'
     and old.status in ('concluido', 'cancelado')
     and new.status is distinct from old.status then
    raise exception using
      errcode = '23514',
      message = 'Atendimento encerrado nao pode ser reaberto.';
  end if;

  if new.status in ('aguardando', 'andamento') then
    new.resultado = null;
    new.motivo_resultado = null;
    new.concluido_em = null;
  elsif new.status = 'cancelado' then
    new.resultado = null;
    new.motivo_resultado = null;
    new.concluido_em = coalesce(new.concluido_em, now());
  elsif new.status = 'concluido' then
    if new.resultado is null then
      raise exception using
        errcode = '23514',
        message = 'Informe o resultado para concluir o atendimento.';
    end if;

    if new.resultado = 'lead_perdido'
       and nullif(trim(coalesce(new.motivo_resultado, '')), '') is null then
      raise exception using
        errcode = '23514',
        message = 'Informe o motivo da perda para concluir o atendimento.';
    end if;

    if new.resultado <> 'lead_perdido' then
      new.motivo_resultado = null;
    end if;

    new.concluido_em = coalesce(new.concluido_em, now());
  end if;

  return new;
end;
$$;

create or replace function gestao_crm.apply_attendance_outcome()
returns trigger
language plpgsql
security definer
set search_path = gestao_crm, public
as $$
begin
  if new.status <> 'concluido' then
    return new;
  end if;

  if new.resultado = 'venda_realizada' then
    update gestao_crm.leads
    set
      status = 'convertido',
      convertido_em = coalesce(convertido_em, now()),
      perdido_em = null,
      motivo_perda = null
    where id = new.lead_id;

    update gestao_crm.clientes
    set status_relacionamento = 'cliente'
    where id = new.cliente_id;
  elsif new.resultado = 'lead_perdido' then
    update gestao_crm.leads
    set
      status = 'perdido',
      perdido_em = coalesce(perdido_em, now()),
      motivo_perda = new.motivo_resultado,
      convertido_em = null
    where id = new.lead_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_crm_attendance_business_state on gestao_crm.atendimentos;
create trigger trg_crm_attendance_business_state
before insert or update on gestao_crm.atendimentos
for each row
execute function gestao_crm.prepare_attendance_business_state();

drop trigger if exists trg_crm_attendance_outcome on gestao_crm.atendimentos;
create trigger trg_crm_attendance_outcome
after insert or update of status, resultado, motivo_resultado on gestao_crm.atendimentos
for each row
execute function gestao_crm.apply_attendance_outcome();

grant execute on function gestao_crm.prepare_attendance_business_state()
  to authenticated, service_role;
grant execute on function gestao_crm.apply_attendance_outcome()
  to authenticated, service_role;

notify pgrst, 'reload schema';
