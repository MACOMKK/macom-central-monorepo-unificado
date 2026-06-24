create or replace function public.sync_colaborador_cargo_from_cargo_id()
returns trigger
language plpgsql
as $$
begin
  if new.cargo_id is not null then
    select c.nome
      into new.cargo
    from public.cargos c
    where c.id = new.cargo_id;
  elsif tg_op = 'UPDATE' and old.cargo_id is not null and new.cargo_id is null then
    new.cargo := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_colaboradores_sync_cargo_id on public.colaboradores;
create trigger trg_colaboradores_sync_cargo_id
before insert or update of cargo_id on public.colaboradores
for each row
execute function public.sync_colaborador_cargo_from_cargo_id();

grant execute on function public.sync_colaborador_cargo_from_cargo_id() to authenticated, service_role;
