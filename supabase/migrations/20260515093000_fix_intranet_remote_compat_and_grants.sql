grant usage on schema public to authenticator;
grant usage on schema gestao_intranet to authenticator, anon;

grant select on all tables in schema public to authenticator;
grant select on all tables in schema gestao_intranet to authenticator, anon;

alter default privileges in schema public
grant select on tables to authenticator;

alter default privileges in schema gestao_intranet
grant select on tables to authenticator;

create or replace function public.has_system_access(system_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.acessos_usuario_sistema aus
    join public.sistemas s on s.id = aus.sistema_id
    where aus.colaborador_id = public.current_colaborador_id()
      and aus.ativo = true
      and s.ativo = true
      and s.slug = system_slug
  );
$$;

create or replace function public.system_access_level(system_slug text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select aus.nivel_acesso
  from public.acessos_usuario_sistema aus
  join public.sistemas s on s.id = aus.sistema_id
  where aus.colaborador_id = public.current_colaborador_id()
    and aus.ativo = true
    and s.ativo = true
    and s.slug = system_slug
  limit 1;
$$;

create or replace function public.is_intranet_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.intranet_is_admin();
$$;

create or replace function public.grant_intranet_access(
  p_email text,
  p_nivel_acesso text default 'user'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colaborador_id uuid;
  v_sistema_id uuid;
  v_level text;
begin
  v_level := case p_nivel_acesso
    when 'user' then 'usuario'
    when 'manager' then 'gestor'
    else p_nivel_acesso
  end;

  if v_level not in ('admin', 'gestor', 'usuario') then
    raise exception 'Nivel de acesso invalido: %', p_nivel_acesso;
  end if;

  select id
    into v_colaborador_id
  from public.colaboradores
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_colaborador_id is null then
    raise exception 'Nenhum colaborador encontrado para o e-mail %', p_email;
  end if;

  select id
    into v_sistema_id
  from public.sistemas
  where slug = 'intranet'
  limit 1;

  if v_sistema_id is null then
    raise exception 'Sistema intranet nao encontrado.';
  end if;

  insert into public.acessos_usuario_sistema (
    colaborador_id,
    sistema_id,
    nivel_acesso,
    ativo
  )
  values (
    v_colaborador_id,
    v_sistema_id,
    v_level,
    true
  )
  on conflict (colaborador_id, sistema_id) do update
    set nivel_acesso = excluded.nivel_acesso,
        ativo = true,
        atualizado_em = now();

  return v_colaborador_id;
end;
$$;

create or replace function public.sync_auth_user_to_colaborador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intranet_system_id uuid;
begin
  insert into public.colaboradores (
    id,
    nome,
    email,
    funcao,
    status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'usuario',
    'ativo'
  )
  on conflict (id) do update
    set nome = excluded.nome,
        email = excluded.email,
        atualizado_em = now();

  insert into gestao_intranet.perfis_colaboradores (colaborador_id)
  values (new.id)
  on conflict (colaborador_id) do nothing;

  select id
    into v_intranet_system_id
  from public.sistemas
  where slug = 'intranet'
    and ativo = true
  limit 1;

  if v_intranet_system_id is not null then
    insert into public.acessos_usuario_sistema (
      colaborador_id,
      sistema_id,
      nivel_acesso,
      ativo
    )
    values (
      new.id,
      v_intranet_system_id,
      'usuario',
      true
    )
    on conflict (colaborador_id, sistema_id) do update
      set ativo = true,
          atualizado_em = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.sync_auth_user_to_colaborador();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row execute procedure public.sync_auth_user_to_colaborador();

notify pgrst, 'reload schema';
notify pgrst, 'reload config';
