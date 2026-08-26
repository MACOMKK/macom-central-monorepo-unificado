-- Habilita RLS em public.empresas e public.cargos.
-- Antes, ambas concediam CRUD total a `authenticated` sem RLS habilitada,
-- permitindo escrita direta via supabase-js/PostgREST, contornando as checagens
-- de permissao das Edge Functions (catalog-api/central-api).

alter table public.empresas enable row level security;
alter table public.cargos enable row level security;

create policy "empresas_select_authenticated" on public.empresas
  for select to authenticated using (true);

create policy "cargos_select_authenticated" on public.cargos
  for select to authenticated using (true);

revoke insert, update, delete on public.empresas from authenticated;
revoke insert, update, delete on public.cargos from authenticated;
