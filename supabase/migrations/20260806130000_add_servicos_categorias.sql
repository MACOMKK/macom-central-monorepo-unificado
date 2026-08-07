-- Cadastro de categorias de despesa do modulo Financeiro (apps/servicos),
-- substituindo o enum fixo (`fornecedor | servico | viagem | reembolso | outros`)
-- por um catalogo gerenciavel pelo financeiro, mesmo padrao ja usado em
-- gestao_servicos.fornecedores. `solicitacoes_pagamento.categoria` continua
-- existindo como snapshot do nome no momento da solicitacao (mesmo padrao de
-- fornecedor/fornecedor_id), agora preenchido pela function a partir de
-- categoria_id.

create table if not exists gestao_servicos.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  criado_por uuid references public.colaboradores(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists idx_servicos_categorias_nome
  on gestao_servicos.categorias (lower(nome));

alter table gestao_servicos.solicitacoes_pagamento
  add column if not exists categoria_id uuid references gestao_servicos.categorias(id) on delete set null;

create index if not exists idx_servicos_solicitacoes_categoria_id
  on gestao_servicos.solicitacoes_pagamento (categoria_id);

-- `categoria` (texto) era limitada ao enum fixo antigo; agora e so snapshot livre
-- do nome da categoria escolhida (mesmo padrao de `fornecedor`), sem enum no banco.
alter table gestao_servicos.solicitacoes_pagamento
  drop constraint if exists solicitacoes_pagamento_categoria_check;

alter table gestao_servicos.categorias enable row level security;

drop policy if exists "servicos_categorias_select" on gestao_servicos.categorias;
create policy "servicos_categorias_select" on gestao_servicos.categorias
for select to authenticated
using (public.servicos_has_access());

drop policy if exists "servicos_categorias_insert" on gestao_servicos.categorias;
create policy "servicos_categorias_insert" on gestao_servicos.categorias
for insert to authenticated
with check (public.servicos_is_financeiro() and criado_por = public.current_colaborador_id());

drop policy if exists "servicos_categorias_update" on gestao_servicos.categorias;
create policy "servicos_categorias_update" on gestao_servicos.categorias
for update to authenticated
using (public.servicos_is_financeiro())
with check (public.servicos_is_financeiro());

grant select, insert, update on gestao_servicos.categorias to authenticated, service_role;

notify pgrst, 'reload schema';
