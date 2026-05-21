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

  if tg_op <> 'DELETE' and v_is_active is true then
    insert into gestao_intranet.permissoes_usuario (
      colaborador_id,
      mod_avisos,
      mod_links,
      mod_colaboradores,
      mod_documentos,
      mod_calendario,
      mod_conhecimento,
      mod_feedback
    )
    values (
      v_colaborador_id,
      'view',
      'view',
      'view',
      'view',
      'view',
      'view',
      'view'
    )
    on conflict (colaborador_id) do nothing;

    return new;
  end if;

  delete from gestao_intranet.permissoes_usuario
  where colaborador_id = v_colaborador_id;

  return coalesce(new, old);
end;
$$;

insert into gestao_intranet.permissoes_usuario (
  colaborador_id,
  mod_avisos,
  mod_links,
  mod_colaboradores,
  mod_documentos,
  mod_calendario,
  mod_conhecimento,
  mod_feedback
)
select
  aus.colaborador_id,
  'view',
  'view',
  'view',
  'view',
  'view',
  'view',
  'view'
from public.acessos_usuario_sistema aus
join public.sistemas s on s.id = aus.sistema_id
join public.colaboradores c on c.id = aus.colaborador_id
left join gestao_intranet.permissoes_usuario pu on pu.colaborador_id = aus.colaborador_id
where s.slug = 'intranet'
  and s.ativo = true
  and aus.ativo = true
  and c.status = 'ativo'
  and pu.id is null
on conflict (colaborador_id) do nothing;
