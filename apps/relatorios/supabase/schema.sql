create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'user',
  active boolean not null default true,
  unit_id uuid,
  unit_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  embed_code text not null,
  unit_id uuid references public.units(id) on delete set null,
  unit_name text,
  category text,
  icon text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.report_permissions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  user_name text,
  report_id uuid not null references public.reports(id) on delete cascade,
  report_title text,
  unit_id uuid references public.units(id) on delete set null,
  unit_name text,
  created_at timestamptz not null default now()
);

create unique index if not exists report_permissions_user_email_report_id_idx
  on public.report_permissions (user_email, report_id);

alter table public.profiles enable row level security;
alter table public.units enable row level security;
alter table public.reports enable row level security;
alter table public.report_permissions enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  to authenticated
  using (
    auth.uid() = id
    or public.is_admin()
  );

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
  on public.profiles for update
  to authenticated
  using (
    auth.uid() = id
    or public.is_admin()
  )
  with check (
    auth.uid() = id
    or public.is_admin()
  );

drop policy if exists "profiles_insert_self_or_admin" on public.profiles;
create policy "profiles_insert_self_or_admin"
  on public.profiles for insert
  to authenticated
  with check (
    (auth.uid() = id and role = 'user')
    or public.is_admin()
  );

drop policy if exists "units_all_authenticated" on public.units;
drop policy if exists "units_select_authenticated" on public.units;
drop policy if exists "units_admin_manage" on public.units;
create policy "units_select_authenticated"
  on public.units
  for select
  to authenticated
  using (true);

create policy "units_admin_manage"
  on public.units
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "reports_all_authenticated" on public.reports;
drop policy if exists "reports_select_authenticated" on public.reports;
drop policy if exists "reports_admin_manage" on public.reports;
create policy "reports_select_authenticated"
  on public.reports
  for select
  to authenticated
  using (true);

create policy "reports_admin_manage"
  on public.reports
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "report_permissions_admin_manage" on public.report_permissions;
create policy "report_permissions_admin_manage"
  on public.report_permissions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "report_permissions_user_select_own" on public.report_permissions;
create policy "report_permissions_user_select_own"
  on public.report_permissions
  for select
  to authenticated
  using (user_email = auth.jwt()->>'email');
