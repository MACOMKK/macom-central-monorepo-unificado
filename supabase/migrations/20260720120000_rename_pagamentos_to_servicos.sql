-- App pagamentos nunca foi usado em producao; renomeia schema/funcoes/policies/slug
-- para servicos (sistema SERVICOS, modulo Financeiro) sem migracao de dados reais.

alter schema gestao_pagamentos rename to gestao_servicos;

alter function public.pagamentos_access_level() rename to servicos_access_level;
alter function public.pagamentos_has_access() rename to servicos_has_access;
alter function public.pagamentos_is_aprovador() rename to servicos_is_aprovador;
alter function public.pagamentos_is_financeiro() rename to servicos_is_financeiro;

create or replace function public.servicos_access_level()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select aus.nivel_acesso
  from public.acessos_usuario_sistema aus
  join public.sistemas s on s.id = aus.sistema_id
  where aus.colaborador_id = public.current_colaborador_id()
    and aus.ativo = true
    and s.slug = 'servicos'
    and s.ativo = true
  limit 1;
$$;

-- Corpos de has_access/is_aprovador/is_financeiro chamavam pagamentos_access_level()
-- por nome (funcoes "language sql" resolvem por nome, nao por OID) - precisam ser
-- recriados apontando para o novo nome, senao quebram apos o rename acima.
create or replace function public.servicos_has_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.servicos_access_level() in ('admin', 'gestor', 'usuario'), false);
$$;

create or replace function public.servicos_is_aprovador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.servicos_access_level() in ('admin', 'gestor'), false);
$$;

create or replace function public.servicos_is_financeiro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.servicos_access_level() = 'admin';
$$;

alter policy "pagamentos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento
  rename to "servicos_solicitacoes_select";
alter policy "pagamentos_solicitacoes_insert" on gestao_servicos.solicitacoes_pagamento
  rename to "servicos_solicitacoes_insert";
alter policy "pagamentos_solicitacoes_update_solicitante" on gestao_servicos.solicitacoes_pagamento
  rename to "servicos_solicitacoes_update_solicitante";
alter policy "pagamentos_solicitacoes_update_aprovador" on gestao_servicos.solicitacoes_pagamento
  rename to "servicos_solicitacoes_update_aprovador";

update public.sistemas
set
  slug = 'servicos',
  nome = 'Servicos',
  descricao = 'Sistema Servicos (Financeiro, Atendimento, Oficina, Estoque, Compras, RH)',
  atualizado_em = now()
where slug = 'pagamentos';

drop policy if exists "storage_comprovantes_pagamento_read_authenticated" on storage.objects;
create policy "storage_comprovantes_pagamento_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'comprovantes-pagamento' and public.has_system_access('servicos'));

drop policy if exists "storage_comprovantes_pagamento_write_authenticated" on storage.objects;
create policy "storage_comprovantes_pagamento_write_authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'comprovantes-pagamento' and public.has_system_access('servicos'));

drop policy if exists "storage_comprovantes_pagamento_update_authenticated" on storage.objects;
create policy "storage_comprovantes_pagamento_update_authenticated"
on storage.objects
for update
to authenticated
using (bucket_id = 'comprovantes-pagamento' and public.has_system_access('servicos'))
with check (bucket_id = 'comprovantes-pagamento' and public.has_system_access('servicos'));

drop policy if exists "storage_comprovantes_pagamento_delete_authenticated" on storage.objects;
create policy "storage_comprovantes_pagamento_delete_authenticated"
on storage.objects
for delete
to authenticated
using (bucket_id = 'comprovantes-pagamento' and public.has_system_access('servicos'));
