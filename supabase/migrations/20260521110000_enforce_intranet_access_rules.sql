create or replace function public.sync_intranet_permissions_from_system_access()
returns trigger
language plpgsql
security definer
set search_path = public, gestao_intranet
as $$
declare
  v_slug text;
  v_colaborador_id uuid;
  v_is_active boolean;
begin
  v_colaborador_id := coalesce(new.colaborador_id, old.colaborador_id);

  select s.slug
    into v_slug
  from public.sistemas s
  where s.id = coalesce(new.sistema_id, old.sistema_id)
  limit 1;

  if v_slug is distinct from 'intranet' then
    return coalesce(new, old);
  end if;

  v_is_active := coalesce(new.ativo, false);

  if tg_op = 'DELETE' or v_is_active is not true then
    delete from gestao_intranet.permissoes_usuario
    where colaborador_id = v_colaborador_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_intranet_permissions_from_system_access on public.acessos_usuario_sistema;

create trigger trg_sync_intranet_permissions_from_system_access
after insert or update or delete on public.acessos_usuario_sistema
for each row
execute function public.sync_intranet_permissions_from_system_access();

delete from gestao_intranet.permissoes_usuario pu
where exists (
  select 1
  from public.colaboradores c
  where c.id = pu.colaborador_id
    and c.status <> 'ativo'
)
or not exists (
  select 1
  from public.acessos_usuario_sistema aus
  join public.sistemas s on s.id = aus.sistema_id
  where aus.colaborador_id = pu.colaborador_id
    and aus.ativo = true
    and s.slug = 'intranet'
    and s.ativo = true
);
