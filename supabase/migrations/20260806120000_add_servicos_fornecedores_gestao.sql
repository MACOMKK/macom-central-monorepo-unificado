-- Tela de gestao de fornecedores (apps/servicos, restrita a papel `financeiro`),
-- substituindo o cadastro inline no drawer de nova solicitacao. Adiciona
-- `ativo` (inativar em vez de apagar, ja que fornecedor pode estar referenciado
-- em solicitacoes existentes) e `atualizado_em` a gestao_servicos.fornecedores.

alter table gestao_servicos.fornecedores
  add column if not exists ativo boolean not null default true;

alter table gestao_servicos.fornecedores
  add column if not exists atualizado_em timestamptz not null default now();

drop policy if exists "servicos_fornecedores_update" on gestao_servicos.fornecedores;
create policy "servicos_fornecedores_update" on gestao_servicos.fornecedores
for update to authenticated
using (public.servicos_is_financeiro())
with check (public.servicos_is_financeiro());

grant update on gestao_servicos.fornecedores to authenticated, service_role;

notify pgrst, 'reload schema';
