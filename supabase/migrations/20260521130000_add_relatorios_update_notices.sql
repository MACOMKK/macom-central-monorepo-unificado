create table if not exists gestao_relatorio.avisos_relatorios (
  id uuid primary key default gen_random_uuid(),
  relatorio_id uuid not null references gestao_relatorio.relatorios(id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  versao integer not null default 1,
  obrigatorio boolean not null default true,
  ativo boolean not null default true,
  criado_por uuid references public.colaboradores(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_relatorio.avisos_relatorios_aceites (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references gestao_relatorio.avisos_relatorios(id) on delete cascade,
  relatorio_id uuid not null references gestao_relatorio.relatorios(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  versao_aceita integer not null,
  aceito_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint avisos_relatorios_aceites_unique unique (aviso_id, colaborador_id)
);

create index if not exists avisos_relatorios_relatorio_id_idx
  on gestao_relatorio.avisos_relatorios (relatorio_id);

create unique index if not exists avisos_relatorios_one_active_per_report_idx
  on gestao_relatorio.avisos_relatorios (relatorio_id)
  where ativo = true;

create index if not exists avisos_relatorios_aceites_colaborador_id_idx
  on gestao_relatorio.avisos_relatorios_aceites (colaborador_id);

create index if not exists avisos_relatorios_aceites_relatorio_id_idx
  on gestao_relatorio.avisos_relatorios_aceites (relatorio_id);

drop trigger if exists avisos_relatorios_set_updated_at on gestao_relatorio.avisos_relatorios;
create trigger avisos_relatorios_set_updated_at
before update on gestao_relatorio.avisos_relatorios
for each row
execute function public.set_updated_at();

drop trigger if exists avisos_relatorios_aceites_set_updated_at on gestao_relatorio.avisos_relatorios_aceites;
create trigger avisos_relatorios_aceites_set_updated_at
before update on gestao_relatorio.avisos_relatorios_aceites
for each row
execute function public.set_updated_at();

alter table gestao_relatorio.avisos_relatorios enable row level security;
alter table gestao_relatorio.avisos_relatorios_aceites enable row level security;

drop policy if exists "avisos_relatorios_select_admin_or_permitted" on gestao_relatorio.avisos_relatorios;
create policy "avisos_relatorios_select_admin_or_permitted"
  on gestao_relatorio.avisos_relatorios
  for select
  using (
    public.relatorios_is_admin()
    or (
      ativo = true
      and exists (
        select 1
        from gestao_relatorio.permissoes_relatorios pr
        where pr.colaborador_id = auth.uid()
          and pr.relatorio_id = avisos_relatorios.relatorio_id
      )
    )
  );

drop policy if exists "avisos_relatorios_admin_manage" on gestao_relatorio.avisos_relatorios;
create policy "avisos_relatorios_admin_manage"
  on gestao_relatorio.avisos_relatorios
  for all
  using (public.relatorios_is_admin())
  with check (public.relatorios_is_admin());

drop policy if exists "avisos_relatorios_aceites_select_admin_or_own" on gestao_relatorio.avisos_relatorios_aceites;
create policy "avisos_relatorios_aceites_select_admin_or_own"
  on gestao_relatorio.avisos_relatorios_aceites
  for select
  using (
    public.relatorios_is_admin()
    or colaborador_id = auth.uid()
  );

drop policy if exists "avisos_relatorios_aceites_insert_own" on gestao_relatorio.avisos_relatorios_aceites;
create policy "avisos_relatorios_aceites_insert_own"
  on gestao_relatorio.avisos_relatorios_aceites
  for insert
  with check (
    public.relatorios_is_admin()
    or (
      colaborador_id = auth.uid()
      and exists (
        select 1
        from gestao_relatorio.avisos_relatorios ar
        join gestao_relatorio.permissoes_relatorios pr on pr.relatorio_id = ar.relatorio_id
        where ar.id = avisos_relatorios_aceites.aviso_id
          and ar.relatorio_id = avisos_relatorios_aceites.relatorio_id
          and ar.ativo = true
          and pr.colaborador_id = auth.uid()
      )
    )
  );

drop policy if exists "avisos_relatorios_aceites_admin_manage" on gestao_relatorio.avisos_relatorios_aceites;
create policy "avisos_relatorios_aceites_admin_manage"
  on gestao_relatorio.avisos_relatorios_aceites
  for all
  using (public.relatorios_is_admin())
  with check (public.relatorios_is_admin());
