create table if not exists gestao_crm.veiculos_interesse (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references gestao_crm.leads(id) on delete cascade,
  marca text,
  modelo text,
  versao text,
  ano integer,
  condicao text not null default 'novo'
    check (condicao in ('novo', 'seminovo', 'usado')),
  faixa_preco_min numeric(12, 2),
  faixa_preco_max numeric(12, 2),
  cor_preferida text,
  combustivel text,
  cambio text,
  principal boolean not null default true,
  observacoes text,
  criado_por uuid references public.colaboradores(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_crm_veiculos_interesse_lead
  on gestao_crm.veiculos_interesse (lead_id);

create index if not exists idx_crm_veiculos_interesse_busca
  on gestao_crm.veiculos_interesse (marca, modelo, versao);

create unique index if not exists idx_crm_veiculos_interesse_principal_unique
  on gestao_crm.veiculos_interesse (lead_id)
  where principal = true;

drop trigger if exists trg_crm_veiculos_interesse_set_updated_at on gestao_crm.veiculos_interesse;
create trigger trg_crm_veiculos_interesse_set_updated_at
before update on gestao_crm.veiculos_interesse
for each row execute function public.set_updated_at();

alter table gestao_crm.veiculos_interesse enable row level security;

drop policy if exists "crm_veiculos_interesse_select" on gestao_crm.veiculos_interesse;
create policy "crm_veiculos_interesse_select"
  on gestao_crm.veiculos_interesse
  for select
  to authenticated
  using (public.crm_can_access_lead(lead_id));

drop policy if exists "crm_veiculos_interesse_manage" on gestao_crm.veiculos_interesse;
create policy "crm_veiculos_interesse_manage"
  on gestao_crm.veiculos_interesse
  for all
  to authenticated
  using (public.crm_can_access_lead(lead_id))
  with check (public.crm_can_access_lead(lead_id));

grant select, insert, update, delete on gestao_crm.veiculos_interesse to authenticated, service_role;

alter table gestao_crm.veiculos_interesse replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_crm'
      and tablename = 'veiculos_interesse'
  ) then
    alter publication supabase_realtime add table gestao_crm.veiculos_interesse;
  end if;
end
$$;
