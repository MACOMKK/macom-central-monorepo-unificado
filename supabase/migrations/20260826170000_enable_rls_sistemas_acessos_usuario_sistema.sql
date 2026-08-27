-- Habilita RLS em public.sistemas e public.acessos_usuario_sistema.
-- Antes, ambas concediam select/insert/update/delete a `authenticated` sem RLS habilitada,
-- permitindo que qualquer usuario autenticado escrevesse direto via supabase-js/PostgREST
-- (ex.: se auto-promover admin de um sistema alterando nivel_acesso), contornando as checagens
-- de permissao das Edge Functions (central-api/plataforma-api/relatorios-api/catalog-api).
-- Nenhum app do monorepo le/grava essas tabelas via client direto (tudo passa por Edge Function
-- com conexao DATABASE_URL/service_role, que ignoram RLS), entao so a escrita e revogada aqui;
-- a leitura via authenticated permanece igual a hoje.

alter table public.sistemas enable row level security;
alter table public.acessos_usuario_sistema enable row level security;

create policy "sistemas_select_authenticated" on public.sistemas
  for select to authenticated using (true);

create policy "acessos_usuario_sistema_select_authenticated" on public.acessos_usuario_sistema
  for select to authenticated using (true);

revoke insert, update, delete on public.sistemas from authenticated;
revoke insert, update, delete on public.acessos_usuario_sistema from authenticated;
