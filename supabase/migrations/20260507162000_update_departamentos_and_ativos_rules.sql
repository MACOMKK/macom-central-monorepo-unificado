alter table if exists public.departamentos
drop column if exists ativo;
create or replace function gestao_ativos.sync_ativo_status()
returns trigger
language plpgsql
as $$
begin
  if new.usuario_id is null then
    new.status = 'disponivel';
  else
    new.status = 'em_uso';
  end if;

  return new;
end;
$$;
drop trigger if exists trg_ativos_sync_status on gestao_ativos.ativos;
create trigger trg_ativos_sync_status
before insert or update on gestao_ativos.ativos
for each row
execute function gestao_ativos.sync_ativo_status();
