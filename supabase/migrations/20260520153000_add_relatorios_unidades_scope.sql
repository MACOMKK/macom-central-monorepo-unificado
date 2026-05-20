alter table gestao_relatorio.relatorios
  add column if not exists todas_unidades boolean not null default false;

create table if not exists gestao_relatorio.relatorios_unidades (
  id uuid primary key default gen_random_uuid(),
  relatorio_id uuid not null references gestao_relatorio.relatorios(id) on delete cascade,
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (relatorio_id, unidade_id)
);

create index if not exists relatorios_todas_unidades_idx
  on gestao_relatorio.relatorios (todas_unidades);

create index if not exists relatorios_unidades_relatorio_id_idx
  on gestao_relatorio.relatorios_unidades (relatorio_id);

create index if not exists relatorios_unidades_unidade_id_idx
  on gestao_relatorio.relatorios_unidades (unidade_id);

alter table gestao_relatorio.relatorios_unidades enable row level security;

drop policy if exists "relatorios_unidades_select_admin_or_permitted" on gestao_relatorio.relatorios_unidades;
create policy "relatorios_unidades_select_admin_or_permitted"
  on gestao_relatorio.relatorios_unidades
  for select
  to authenticated
  using (
    public.relatorios_is_admin()
    or exists (
      select 1
      from gestao_relatorio.permissoes_relatorios pr
      where pr.colaborador_id = public.current_colaborador_id()
        and pr.relatorio_id = relatorios_unidades.relatorio_id
    )
  );

drop policy if exists "relatorios_unidades_admin_manage" on gestao_relatorio.relatorios_unidades;
create policy "relatorios_unidades_admin_manage"
  on gestao_relatorio.relatorios_unidades
  for all
  to authenticated
  using (public.relatorios_is_admin())
  with check (public.relatorios_is_admin());

insert into gestao_relatorio.relatorios_unidades (relatorio_id, unidade_id)
select r.id, r.unidade_id
from gestao_relatorio.relatorios r
where r.unidade_id is not null
on conflict (relatorio_id, unidade_id) do nothing;
