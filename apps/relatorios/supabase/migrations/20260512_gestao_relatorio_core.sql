create extension if not exists pgcrypto;

create schema if not exists gestao_relatorio;

create table if not exists gestao_relatorio.relatorios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  embed_code text not null,
  unidade_id uuid references public.unidades(id) on delete set null,
  categoria text,
  icone text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_relatorio.permissoes_relatorios (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  relatorio_id uuid not null references gestao_relatorio.relatorios(id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (colaborador_id, relatorio_id)
);

create index if not exists relatorios_unidade_id_idx
  on gestao_relatorio.relatorios (unidade_id);

create index if not exists relatorios_categoria_idx
  on gestao_relatorio.relatorios (categoria);

create index if not exists permissoes_relatorios_colaborador_id_idx
  on gestao_relatorio.permissoes_relatorios (colaborador_id);

create index if not exists permissoes_relatorios_relatorio_id_idx
  on gestao_relatorio.permissoes_relatorios (relatorio_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists relatorios_set_updated_at on gestao_relatorio.relatorios;
create trigger relatorios_set_updated_at
before update on gestao_relatorio.relatorios
for each row
execute function public.set_updated_at();

drop trigger if exists permissoes_relatorios_set_updated_at on gestao_relatorio.permissoes_relatorios;
create trigger permissoes_relatorios_set_updated_at
before update on gestao_relatorio.permissoes_relatorios
for each row
execute function public.set_updated_at();

alter table gestao_relatorio.relatorios enable row level security;
alter table gestao_relatorio.permissoes_relatorios enable row level security;

create or replace function public.relatorios_access_level()
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
    and s.slug = 'relatorios'
    and s.ativo = true
  limit 1;
$$;

create or replace function public.relatorios_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.relatorios_access_level() = 'admin';
$$;

drop policy if exists "relatorios_select_admin_or_permitted" on gestao_relatorio.relatorios;
create policy "relatorios_select_admin_or_permitted"
  on gestao_relatorio.relatorios
  for select
  to authenticated
  using (
    public.relatorios_is_admin()
    or exists (
      select 1
      from gestao_relatorio.permissoes_relatorios pr
      where pr.colaborador_id = auth.uid()
        and pr.relatorio_id = relatorios.id
    )
  );

drop policy if exists "relatorios_admin_manage" on gestao_relatorio.relatorios;
create policy "relatorios_admin_manage"
  on gestao_relatorio.relatorios
  for all
  to authenticated
  using (public.relatorios_is_admin())
  with check (public.relatorios_is_admin());

drop policy if exists "permissoes_relatorios_select_admin_or_own" on gestao_relatorio.permissoes_relatorios;
create policy "permissoes_relatorios_select_admin_or_own"
  on gestao_relatorio.permissoes_relatorios
  for select
  to authenticated
  using (
    public.relatorios_is_admin()
    or colaborador_id = auth.uid()
  );

drop policy if exists "permissoes_relatorios_admin_manage" on gestao_relatorio.permissoes_relatorios;
create policy "permissoes_relatorios_admin_manage"
  on gestao_relatorio.permissoes_relatorios
  for all
  to authenticated
  using (public.relatorios_is_admin())
  with check (public.relatorios_is_admin());
