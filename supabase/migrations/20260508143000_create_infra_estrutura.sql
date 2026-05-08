create schema if not exists gestao_ativos;

create table if not exists gestao_ativos.infra_estrutura (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  nome text not null,
  valor_identificador text not null,
  descricao text,
  unidade_id uuid not null references public.unidades (id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint infra_estrutura_tipo_check check (tipo in ('ip', 'link'))
);

create index if not exists idx_infra_estrutura_tipo
  on gestao_ativos.infra_estrutura (tipo);

create index if not exists idx_infra_estrutura_nome
  on gestao_ativos.infra_estrutura (nome);

create index if not exists idx_infra_estrutura_unidade_id
  on gestao_ativos.infra_estrutura (unidade_id);

drop trigger if exists trg_infra_estrutura_set_atualizado_em on gestao_ativos.infra_estrutura;

create trigger trg_infra_estrutura_set_atualizado_em
before update on gestao_ativos.infra_estrutura
for each row
execute function gestao_ativos.set_atualizado_em();
