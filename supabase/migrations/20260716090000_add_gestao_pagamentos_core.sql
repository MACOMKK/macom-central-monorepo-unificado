create extension if not exists pgcrypto;
create schema if not exists gestao_pagamentos;

insert into public.sistemas (slug, nome, descricao, ativo)
values ('pagamentos', 'Pagamentos', 'Solicitacoes e fluxo de pagamentos', true)
on conflict (slug) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  ativo = excluded.ativo,
  atualizado_em = now();

create table if not exists gestao_pagamentos.solicitacoes_pagamento (
  id uuid primary key default gen_random_uuid(),
  solicitante_id uuid not null references public.colaboradores(id) on delete restrict,
  fornecedor text not null,
  descricao text not null,
  valor numeric(12, 2) not null check (valor > 0),
  categoria text not null default 'outros'
    check (categoria in ('fornecedor', 'servico', 'viagem', 'reembolso', 'outros')),
  comprovante_path text,
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'reprovado', 'pago')),
  observacao_analise text,
  analisado_por uuid references public.colaboradores(id) on delete set null,
  analisado_em timestamptz,
  pago_por uuid references public.colaboradores(id) on delete set null,
  pago_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.colaboradores(id) on delete set null
);

create index if not exists idx_pagamentos_solicitacoes_status
  on gestao_pagamentos.solicitacoes_pagamento (status);
create index if not exists idx_pagamentos_solicitacoes_solicitante_id
  on gestao_pagamentos.solicitacoes_pagamento (solicitante_id);
create index if not exists idx_pagamentos_solicitacoes_criado_em
  on gestao_pagamentos.solicitacoes_pagamento (criado_em desc);

drop trigger if exists trg_pagamentos_solicitacoes_set_updated_at on gestao_pagamentos.solicitacoes_pagamento;
create trigger trg_pagamentos_solicitacoes_set_updated_at
before update on gestao_pagamentos.solicitacoes_pagamento
for each row
execute function public.set_updated_at();

create or replace function public.pagamentos_access_level()
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
    and s.slug = 'pagamentos'
    and s.ativo = true
  limit 1;
$$;

create or replace function public.pagamentos_has_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.pagamentos_access_level() in ('admin', 'gestor', 'usuario'), false);
$$;

create or replace function public.pagamentos_is_aprovador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.pagamentos_access_level() in ('admin', 'gestor'), false);
$$;

create or replace function public.pagamentos_is_financeiro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pagamentos_access_level() = 'admin';
$$;

alter table gestao_pagamentos.solicitacoes_pagamento enable row level security;

drop policy if exists "pagamentos_solicitacoes_select" on gestao_pagamentos.solicitacoes_pagamento;
create policy "pagamentos_solicitacoes_select" on gestao_pagamentos.solicitacoes_pagamento
for select to authenticated
using (
  public.pagamentos_is_aprovador()
  or (public.pagamentos_has_access() and solicitante_id = public.current_colaborador_id())
);

drop policy if exists "pagamentos_solicitacoes_insert" on gestao_pagamentos.solicitacoes_pagamento;
create policy "pagamentos_solicitacoes_insert" on gestao_pagamentos.solicitacoes_pagamento
for insert to authenticated
with check (
  public.pagamentos_has_access()
  and solicitante_id = public.current_colaborador_id()
);

drop policy if exists "pagamentos_solicitacoes_update_solicitante" on gestao_pagamentos.solicitacoes_pagamento;
create policy "pagamentos_solicitacoes_update_solicitante" on gestao_pagamentos.solicitacoes_pagamento
for update to authenticated
using (
  public.pagamentos_has_access()
  and solicitante_id = public.current_colaborador_id()
  and status = 'pendente'
)
with check (
  solicitante_id = public.current_colaborador_id()
  and status = 'pendente'
);

drop policy if exists "pagamentos_solicitacoes_update_aprovador" on gestao_pagamentos.solicitacoes_pagamento;
create policy "pagamentos_solicitacoes_update_aprovador" on gestao_pagamentos.solicitacoes_pagamento
for update to authenticated
using (public.pagamentos_is_aprovador())
with check (public.pagamentos_is_aprovador());

grant usage on schema gestao_pagamentos to authenticated, service_role;
grant select, insert, update, delete on all tables in schema gestao_pagamentos to authenticated, service_role;
