create extension if not exists pgcrypto;
create extension if not exists citext with schema public;
create schema if not exists base;
create type base.user_status as enum ('pending', 'active', 'inactive', 'blocked');
create type base.role_assignment_status as enum ('active', 'inactive');
create type base.audit_actor_type as enum ('user', 'service', 'system');
create table if not exists base.modules (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint modules_key_format_chk check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint modules_key_unique unique (key)
);
create table if not exists base.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email public.citext not null,
  full_name text,
  display_name text,
  phone text,
  avatar_url text,
  locale text,
  timezone text,
  status base.user_status not null default 'active',
  last_sign_in_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_email_unique unique (email),
  constraint profiles_display_name_len_chk check (
    display_name is null or char_length(btrim(display_name)) between 2 and 120
  ),
  constraint profiles_full_name_len_chk check (
    full_name is null or char_length(btrim(full_name)) between 3 and 200
  )
);
create table if not exists base.roles (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references base.modules(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint roles_code_format_chk check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint roles_module_code_unique unique (module_id, code)
);
create table if not exists base.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references base.roles(id) on delete restrict,
  status base.role_assignment_status not null default 'active',
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_role_assignments_unique unique (user_id, role_id),
  constraint user_role_assignments_revoked_after_granted_chk check (
    revoked_at is null or revoked_at >= granted_at
  )
);
create table if not exists base.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type base.audit_actor_type not null default 'user',
  module_key text not null,
  entity_schema text not null,
  entity_table text not null,
  entity_id uuid,
  action text not null,
  summary text,
  request_id text,
  ip_address inet,
  user_agent text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint audit_log_action_len_chk check (char_length(btrim(action)) > 0),
  constraint audit_log_module_key_format_chk check (module_key ~ '^[a-z][a-z0-9_]*$')
);
create index if not exists idx_profiles_status on base.profiles(status);
create index if not exists idx_profiles_email on base.profiles(email);
create index if not exists idx_roles_module_id on base.roles(module_id);
create index if not exists idx_user_role_assignments_user_id on base.user_role_assignments(user_id);
create index if not exists idx_user_role_assignments_role_id on base.user_role_assignments(role_id);
create index if not exists idx_user_role_assignments_status on base.user_role_assignments(status);
create index if not exists idx_audit_log_module_entity_created_at
  on base.audit_log(module_key, entity_schema, entity_table, created_at desc);
create index if not exists idx_audit_log_actor_user_id_created_at
  on base.audit_log(actor_user_id, created_at desc);
create or replace function base.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;
create or replace function base.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;
create or replace function base.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from base.user_role_assignments ura
    join base.roles r on r.id = ura.role_id
    join base.modules m on m.id = r.module_id
    where ura.user_id = auth.uid()
      and ura.status = 'active'
      and (ura.expires_at is null or ura.expires_at > timezone('utc', now()))
      and m.key = 'base'
      and r.code = 'platform_admin'
  )
$$;
create or replace function base.user_has_role(module_key text, role_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from base.user_role_assignments ura
    join base.roles r on r.id = ura.role_id
    join base.modules m on m.id = r.module_id
    where ura.user_id = auth.uid()
      and ura.status = 'active'
      and (ura.expires_at is null or ura.expires_at > timezone('utc', now()))
      and m.key = user_has_role.module_key
      and r.code = user_has_role.role_code
  )
$$;
create or replace function base.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into base.profiles (
    id,
    email,
    full_name,
    display_name,
    avatar_url,
    last_sign_in_at
  )
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(
      btrim(
        coalesce(
          new.raw_user_meta_data ->> 'display_name',
          new.raw_user_meta_data ->> 'name',
          new.raw_user_meta_data ->> 'full_name',
          ''
        )
      ),
      ''
    ),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), ''),
    new.last_sign_in_at
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, base.profiles.full_name),
        display_name = coalesce(excluded.display_name, base.profiles.display_name),
        avatar_url = coalesce(excluded.avatar_url, base.profiles.avatar_url),
        last_sign_in_at = coalesce(excluded.last_sign_in_at, base.profiles.last_sign_in_at),
        updated_at = timezone('utc', now());

  return new;
end;
$$;
create or replace function base.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update base.profiles
  set email = new.email,
      last_sign_in_at = coalesce(new.last_sign_in_at, base.profiles.last_sign_in_at),
      full_name = coalesce(
        nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
        base.profiles.full_name
      ),
      display_name = coalesce(
        nullif(
          btrim(
            coalesce(
              new.raw_user_meta_data ->> 'display_name',
              new.raw_user_meta_data ->> 'name',
              ''
            )
          ),
          ''
        ),
        base.profiles.display_name
      ),
      avatar_url = coalesce(
        nullif(btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), ''),
        base.profiles.avatar_url
      ),
      updated_at = timezone('utc', now())
  where id = new.id;

  return new;
end;
$$;
create or replace function base.create_audit_entry(
  p_module_key text,
  p_entity_schema text,
  p_entity_table text,
  p_entity_id uuid,
  p_action text,
  p_summary text default null,
  p_before_data jsonb default null,
  p_after_data jsonb default null,
  p_actor_type base.audit_actor_type default 'user'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into base.audit_log (
    actor_user_id,
    actor_type,
    module_key,
    entity_schema,
    entity_table,
    entity_id,
    action,
    summary,
    before_data,
    after_data
  )
  values (
    auth.uid(),
    p_actor_type,
    p_module_key,
    p_entity_schema,
    p_entity_table,
    p_entity_id,
    p_action,
    p_summary,
    p_before_data,
    p_after_data
  )
  returning id into v_id;

  return v_id;
end;
$$;
create trigger trg_modules_set_updated_at
before update on base.modules
for each row execute function base.set_updated_at();
create trigger trg_profiles_set_updated_at
before update on base.profiles
for each row execute function base.set_updated_at();
create trigger trg_roles_set_updated_at
before update on base.roles
for each row execute function base.set_updated_at();
create trigger trg_user_role_assignments_set_updated_at
before update on base.user_role_assignments
for each row execute function base.set_updated_at();
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function base.handle_new_auth_user();
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, raw_user_meta_data, last_sign_in_at on auth.users
for each row execute function base.handle_auth_user_updated();
insert into base.modules (key, name, description)
values ('base', 'Base', 'Schema universal de identidade, acesso e auditoria.')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = timezone('utc', now());
insert into base.roles (module_id, code, name, description)
select
  m.id,
  'platform_admin',
  'Platform Admin',
  'Administrador global com capacidade de gerenciar usuarios, papeis e configuracoes transversais.'
from base.modules m
where m.key = 'base'
on conflict (module_id, code) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = timezone('utc', now());
revoke all on schema base from public;
grant usage on schema base to authenticated;
grant usage on schema base to service_role;
revoke all on all tables in schema base from public;
grant select, update on base.profiles to authenticated;
grant select on base.modules to authenticated;
grant select on base.roles to authenticated;
grant select on base.user_role_assignments to authenticated;
grant select on base.audit_log to authenticated;
revoke all on all functions in schema base from public;
grant execute on function base.current_user_id() to authenticated;
grant execute on function base.is_platform_admin() to authenticated;
grant execute on function base.user_has_role(text, text) to authenticated;
grant execute on function base.create_audit_entry(
  text,
  text,
  text,
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  base.audit_actor_type
) to service_role;
alter table base.modules enable row level security;
alter table base.profiles enable row level security;
alter table base.roles enable row level security;
alter table base.user_role_assignments enable row level security;
alter table base.audit_log enable row level security;
create policy modules_select_authenticated
on base.modules
for select
to authenticated
using (true);
create policy profiles_select_self_or_platform_admin
on base.profiles
for select
to authenticated
using (auth.uid() = id or base.is_platform_admin());
create policy profiles_update_self_or_platform_admin
on base.profiles
for update
to authenticated
using (auth.uid() = id or base.is_platform_admin())
with check (auth.uid() = id or base.is_platform_admin());
create policy roles_select_authenticated
on base.roles
for select
to authenticated
using (true);
create policy role_assignments_select_self_or_platform_admin
on base.user_role_assignments
for select
to authenticated
using (user_id = auth.uid() or base.is_platform_admin());
create policy audit_log_select_platform_admin
on base.audit_log
for select
to authenticated
using (base.is_platform_admin());
