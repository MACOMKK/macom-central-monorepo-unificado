create table if not exists gestao_crm.categorias_veiculo (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

drop trigger if exists trg_crm_categorias_veiculo_set_updated_at on gestao_crm.categorias_veiculo;
create trigger trg_crm_categorias_veiculo_set_updated_at
before update on gestao_crm.categorias_veiculo
for each row execute function public.set_updated_at();

alter table gestao_crm.categorias_veiculo enable row level security;

drop policy if exists "crm_categorias_veiculo_select" on gestao_crm.categorias_veiculo;
create policy "crm_categorias_veiculo_select" on gestao_crm.categorias_veiculo
for select to authenticated using (public.crm_has_access());

drop policy if exists "crm_categorias_veiculo_manage" on gestao_crm.categorias_veiculo;
create policy "crm_categorias_veiculo_manage" on gestao_crm.categorias_veiculo
for all to authenticated
using (public.crm_access_level() in ('admin', 'gestor'))
with check (public.crm_access_level() in ('admin', 'gestor'));

grant select, insert, update, delete on gestao_crm.categorias_veiculo to authenticated, service_role;

insert into gestao_crm.categorias_veiculo (nome)
values ('Moto'), ('Carro')
on conflict (nome) do nothing;

alter table gestao_crm.veiculos_interesse
  add column if not exists categoria_veiculo_id uuid references gestao_crm.categorias_veiculo(id);

alter table gestao_crm.veiculos_interesse
  drop column if exists categoria_veiculo;

alter table gestao_crm.categorias_veiculo replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_crm'
      and tablename = 'categorias_veiculo'
  ) then
    alter publication supabase_realtime add table gestao_crm.categorias_veiculo;
  end if;
end
$$;

notify pgrst, 'reload schema';
