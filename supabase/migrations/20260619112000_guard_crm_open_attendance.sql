create or replace function gestao_crm.prevent_attendance_when_lead_has_open_one()
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
      and existing.status in ('aguardando', 'andamento')
  ) then
    raise exception using
      errcode = '23505',
      message = 'Este lead ja possui um atendimento em aberto.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_crm_guard_open_attendance on gestao_crm.atendimentos;
create trigger trg_crm_guard_open_attendance
before insert on gestao_crm.atendimentos
for each row
execute function gestao_crm.prevent_attendance_when_lead_has_open_one();

grant execute on function gestao_crm.prevent_attendance_when_lead_has_open_one()
  to authenticated, service_role;
