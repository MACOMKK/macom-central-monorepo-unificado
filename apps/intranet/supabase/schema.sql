create extension if not exists "pgcrypto";

create schema if not exists gestao_intranet;

grant usage on schema public to authenticated, service_role;
grant usage on schema gestao_intranet to authenticated, service_role;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create table if not exists public.sistemas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao text,
  url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.departamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  cidade text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.colaboradores (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null unique,
  telefone text,
  departamento_id uuid references public.departamentos (id) on delete set null,
  cargo text,
  funcao text not null default 'usuario',
  unidade_id uuid references public.unidades (id) on delete set null,
  data_nascimento date,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.acessos_usuario_sistema (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores (id) on delete cascade,
  sistema_id uuid not null references public.sistemas (id) on delete cascade,
  nivel_acesso text not null default 'usuario' check (nivel_acesso in ('admin', 'usuario')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (colaborador_id, sistema_id)
);

create table if not exists gestao_intranet.perfis_colaboradores (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null unique references public.colaboradores (id) on delete cascade,
  foto_url text,
  bio text,
  frase_status text,
  linkedin_url text,
  whatsapp_url text,
  localizacao_interna text,
  habilidades text[] not null default '{}',
  interesses text[] not null default '{}',
  preferencias jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_intranet.permissoes_usuario (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null unique references public.colaboradores (id) on delete cascade,
  mod_avisos text not null default 'view' check (mod_avisos in ('none', 'view', 'edit')),
  mod_links text not null default 'view' check (mod_links in ('none', 'view', 'edit')),
  mod_colaboradores text not null default 'view' check (mod_colaboradores in ('none', 'view', 'edit')),
  mod_documentos text not null default 'view' check (mod_documentos in ('none', 'view', 'edit')),
  mod_calendario text not null default 'view' check (mod_calendario in ('none', 'view', 'edit')),
  mod_conhecimento text not null default 'view' check (mod_conhecimento in ('none', 'view', 'edit')),
  mod_feedback text not null default 'view' check (mod_feedback in ('none', 'view', 'edit')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_intranet.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null,
  categoria text default 'geral',
  prioridade text default 'media',
  fixado boolean not null default false,
  publica_em timestamptz,
  expira_em timestamptz,
  criado_por uuid references public.colaboradores (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_intranet.comentarios_avisos (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references gestao_intranet.avisos (id) on delete cascade,
  conteudo text not null,
  criado_por uuid references public.colaboradores (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_intranet.reacoes_avisos (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references gestao_intranet.avisos (id) on delete cascade,
  emoji text not null,
  criado_por uuid references public.colaboradores (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (aviso_id, emoji, criado_por)
);

create table if not exists gestao_intranet.base_conhecimento (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null,
  categoria text default 'geral',
  tipo text default 'faq',
  tags text[] not null default '{}',
  fixado boolean not null default false,
  contador_util integer not null default 0,
  criado_por uuid references public.colaboradores (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_intranet.feedback (
  id uuid primary key default gen_random_uuid(),
  tipo text default 'sugestao',
  categoria text default 'geral',
  titulo text not null,
  conteudo text not null,
  anonimo boolean not null default false,
  status text not null default 'pendente',
  resposta_admin text,
  criado_por uuid references public.colaboradores (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_intranet.links_uteis (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  url text not null,
  descricao text,
  icone text,
  categoria text default 'sistema',
  mostrar_na_dashboard boolean not null default false,
  criado_por uuid references public.colaboradores (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_intranet.eventos_calendario (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  data_evento date not null,
  horario text,
  tipo text default 'evento',
  local text,
  departamento_id uuid references public.departamentos (id) on delete set null,
  unidade_id uuid references public.unidades (id) on delete set null,
  criado_por uuid references public.colaboradores (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_intranet.documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  arquivo_url text,
  arquivo_path text,
  arquivo_nome text,
  arquivo_tipo text,
  arquivo_tamanho bigint,
  empresa text not null default 'macom_motors'
    check (empresa in ('macom_motors', 'macom_mitsubishi')),
  categoria text default 'outros',
  departamento_id uuid references public.departamentos (id) on delete set null,
  criado_por uuid references public.colaboradores (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create or replace function public.sync_auth_user_to_colaborador()
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

insert into public.sistemas (nome, slug, descricao, url, ativo)
values ('Intranet', 'intranet', 'Sistema principal da intranet', '/', true)
on conflict (slug) do update
  set nome = excluded.nome,
      descricao = excluded.descricao,
      url = excluded.url,
      ativo = excluded.ativo,
      atualizado_em = now();

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', true)
on conflict (id) do nothing;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'sistemas',
    'departamentos',
    'unidades',
    'colaboradores',
    'acessos_usuario_sistema'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute procedure public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;

  foreach table_name in array array[
    'perfis_colaboradores',
    'permissoes_usuario',
    'avisos',
    'comentarios_avisos',
    'reacoes_avisos',
    'base_conhecimento',
    'feedback',
    'links_uteis',
    'eventos_calendario',
    'documentos'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on gestao_intranet.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on gestao_intranet.%I for each row execute procedure public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

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
    where aus.colaborador_id = auth.uid()
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
  where aus.colaborador_id = auth.uid()
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
  select coalesce(public.system_access_level('intranet') = 'admin', false);
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
begin
  if p_nivel_acesso not in ('admin', 'user', 'usuario') then
    raise exception 'Nivel de acesso invalido: %', p_nivel_acesso;
  end if;

  if p_nivel_acesso = 'user' then
    p_nivel_acesso := 'usuario';
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
    p_nivel_acesso,
    true
  )
  on conflict (colaborador_id, sistema_id) do update
    set nivel_acesso = excluded.nivel_acesso,
        ativo = true,
        atualizado_em = now();

  return v_colaborador_id;
end;
$$;

grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema gestao_intranet to authenticated, service_role;

alter table public.sistemas enable row level security;
alter table public.departamentos enable row level security;
alter table public.unidades enable row level security;
alter table public.colaboradores enable row level security;
alter table public.acessos_usuario_sistema enable row level security;
alter table gestao_intranet.perfis_colaboradores enable row level security;
alter table gestao_intranet.permissoes_usuario enable row level security;
alter table gestao_intranet.avisos enable row level security;
alter table gestao_intranet.comentarios_avisos enable row level security;
alter table gestao_intranet.reacoes_avisos enable row level security;
alter table gestao_intranet.base_conhecimento enable row level security;
alter table gestao_intranet.feedback enable row level security;
alter table gestao_intranet.links_uteis enable row level security;
alter table gestao_intranet.eventos_calendario enable row level security;
alter table gestao_intranet.documentos enable row level security;

drop policy if exists "sistemas_read_authenticated" on public.sistemas;
create policy "sistemas_read_authenticated"
on public.sistemas
for select
to authenticated
using (true);

drop policy if exists "sistemas_admin_manage" on public.sistemas;
create policy "sistemas_admin_manage"
on public.sistemas
for all
to authenticated
using (public.is_intranet_admin())
with check (public.is_intranet_admin());

drop policy if exists "departamentos_read_authenticated" on public.departamentos;
create policy "departamentos_read_authenticated"
on public.departamentos
for select
to authenticated
using (public.has_system_access('intranet'));

drop policy if exists "departamentos_admin_manage" on public.departamentos;
create policy "departamentos_admin_manage"
on public.departamentos
for all
to authenticated
using (public.is_intranet_admin())
with check (public.is_intranet_admin());

drop policy if exists "unidades_read_authenticated" on public.unidades;
create policy "unidades_read_authenticated"
on public.unidades
for select
to authenticated
using (public.has_system_access('intranet'));

drop policy if exists "unidades_admin_manage" on public.unidades;
create policy "unidades_admin_manage"
on public.unidades
for all
to authenticated
using (public.is_intranet_admin())
with check (public.is_intranet_admin());

drop policy if exists "colaboradores_read_authenticated" on public.colaboradores;
create policy "colaboradores_read_authenticated"
on public.colaboradores
for select
to authenticated
using (id = auth.uid() or public.has_system_access('intranet'));

drop policy if exists "colaboradores_update_self_or_admin" on public.colaboradores;
create policy "colaboradores_update_self_or_admin"
on public.colaboradores
for update
to authenticated
using (id = auth.uid() or public.is_intranet_admin())
with check (id = auth.uid() or public.is_intranet_admin());

drop policy if exists "colaboradores_delete_admin" on public.colaboradores;
create policy "colaboradores_delete_admin"
on public.colaboradores
for delete
to authenticated
using (public.is_intranet_admin());

drop policy if exists "acessos_read_self_or_admin" on public.acessos_usuario_sistema;
create policy "acessos_read_self_or_admin"
on public.acessos_usuario_sistema
for select
to authenticated
using (colaborador_id = auth.uid() or public.is_intranet_admin());

drop policy if exists "acessos_admin_manage" on public.acessos_usuario_sistema;
create policy "acessos_admin_manage"
on public.acessos_usuario_sistema
for all
to authenticated
using (public.is_intranet_admin())
with check (public.is_intranet_admin());

drop policy if exists "perfis_read_self_or_authenticated" on gestao_intranet.perfis_colaboradores;
create policy "perfis_read_self_or_authenticated"
on gestao_intranet.perfis_colaboradores
for select
to authenticated
using (colaborador_id = auth.uid() or public.has_system_access('intranet'));

drop policy if exists "perfis_update_self_or_admin" on gestao_intranet.perfis_colaboradores;
create policy "perfis_update_self_or_admin"
on gestao_intranet.perfis_colaboradores
for all
to authenticated
using (colaborador_id = auth.uid() or public.is_intranet_admin())
with check (colaborador_id = auth.uid() or public.is_intranet_admin());

drop policy if exists "permissoes_read_self_or_admin" on gestao_intranet.permissoes_usuario;
create policy "permissoes_read_self_or_admin"
on gestao_intranet.permissoes_usuario
for select
to authenticated
using (colaborador_id = auth.uid() or public.is_intranet_admin());

drop policy if exists "permissoes_admin_manage" on gestao_intranet.permissoes_usuario;
create policy "permissoes_admin_manage"
on gestao_intranet.permissoes_usuario
for all
to authenticated
using (public.is_intranet_admin())
with check (public.is_intranet_admin());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'avisos',
    'comentarios_avisos',
    'reacoes_avisos',
    'base_conhecimento',
    'feedback',
    'links_uteis',
    'eventos_calendario',
    'documentos'
  ]
  loop
    execute format('drop policy if exists "%I_read_intranet_users" on gestao_intranet.%I', table_name, table_name);
    execute format(
      'create policy "%I_read_intranet_users" on gestao_intranet.%I for select to authenticated using (public.has_system_access(''intranet''))',
      table_name,
      table_name
    );

    execute format('drop policy if exists "%I_insert_intranet_users" on gestao_intranet.%I', table_name, table_name);
    execute format(
      'create policy "%I_insert_intranet_users" on gestao_intranet.%I for insert to authenticated with check (public.has_system_access(''intranet''))',
      table_name,
      table_name
    );

    execute format('drop policy if exists "%I_update_admin_or_owner" on gestao_intranet.%I', table_name, table_name);
    execute format(
      'create policy "%I_update_admin_or_owner" on gestao_intranet.%I for update to authenticated using (public.is_intranet_admin() or criado_por = auth.uid()) with check (public.is_intranet_admin() or criado_por = auth.uid())',
      table_name,
      table_name
    );

    execute format('drop policy if exists "%I_delete_admin_or_owner" on gestao_intranet.%I', table_name, table_name);
    execute format(
      'create policy "%I_delete_admin_or_owner" on gestao_intranet.%I for delete to authenticated using (public.is_intranet_admin() or criado_por = auth.uid())',
      table_name,
      table_name
    );
  end loop;
end $$;

drop policy if exists "storage_documents_read_authenticated" on storage.objects;
create policy "storage_documents_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'documentos' and public.has_system_access('intranet'));

drop policy if exists "storage_documents_write_authenticated" on storage.objects;
create policy "storage_documents_write_authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'documentos' and public.has_system_access('intranet'));

drop policy if exists "storage_documents_update_authenticated" on storage.objects;
create policy "storage_documents_update_authenticated"
on storage.objects
for update
to authenticated
using (bucket_id = 'documentos' and public.has_system_access('intranet'))
with check (bucket_id = 'documentos' and public.has_system_access('intranet'));

drop policy if exists "storage_documents_delete_authenticated" on storage.objects;
create policy "storage_documents_delete_authenticated"
on storage.objects
for delete
to authenticated
using (bucket_id = 'documentos' and public.has_system_access('intranet'));
