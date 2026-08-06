-- Cadastro de fornecedores do modulo Financeiro (apps/servicos), substituindo o
-- campo livre `fornecedor` por um catalogo reutilizavel (evita duplicidade/erro
-- de digitacao). `solicitacoes_pagamento.fornecedor` continua existindo como
-- snapshot do nome no momento da solicitacao (mesmo padrao de empresa_id),
-- agora preenchido pela function a partir de `fornecedor_id`.

create table if not exists gestao_servicos.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_por uuid references public.colaboradores(id) on delete set null,
  criado_em timestamptz not null default now()
);

create unique index if not exists idx_servicos_fornecedores_nome
  on gestao_servicos.fornecedores (lower(nome));

alter table gestao_servicos.solicitacoes_pagamento
  add column if not exists fornecedor_id uuid references gestao_servicos.fornecedores(id) on delete set null;

create index if not exists idx_servicos_solicitacoes_fornecedor_id
  on gestao_servicos.solicitacoes_pagamento (fornecedor_id);

alter table gestao_servicos.fornecedores enable row level security;

drop policy if exists "servicos_fornecedores_select" on gestao_servicos.fornecedores;
create policy "servicos_fornecedores_select" on gestao_servicos.fornecedores
for select to authenticated
using (public.servicos_has_access());

drop policy if exists "servicos_fornecedores_insert" on gestao_servicos.fornecedores;
create policy "servicos_fornecedores_insert" on gestao_servicos.fornecedores
for insert to authenticated
with check (public.servicos_has_access() and criado_por = public.current_colaborador_id());

grant select, insert on gestao_servicos.fornecedores to authenticated, service_role;

notify pgrst, 'reload schema';
