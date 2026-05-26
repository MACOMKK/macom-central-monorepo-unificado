do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'perfis'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'colaboradores'
  ) then
    alter table public.perfis rename to colaboradores;
  end if;
end
$$;
alter index if exists public.perfis_pkey rename to colaboradores_pkey;
alter index if exists public.perfis_cpf_key rename to colaboradores_cpf_key;
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'perfis_departamento_id_fkey'
  ) then
    alter table public.colaboradores
      rename constraint perfis_departamento_id_fkey to colaboradores_departamento_id_fkey;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'perfis_unidade_id_fkey'
  ) then
    alter table public.colaboradores
      rename constraint perfis_unidade_id_fkey to colaboradores_unidade_id_fkey;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'perfis_id_fkey'
  ) then
    alter table public.colaboradores
      rename constraint perfis_id_fkey to colaboradores_id_fkey;
  end if;
end
$$;
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    coalesce(new.raw_user_meta_data ->> 'funcao', 'usuario'),
    'ativo'
  )
  on conflict (id) do update
  set
    nome = excluded.nome,
    email = excluded.email,
    funcao = excluded.funcao,
    status = coalesce(public.colaboradores.status, 'ativo'),
    atualizado_em = now();

  return new;
end;
$$;
