create schema if not exists gestao_ativos;
create table if not exists gestao_ativos.termos_posse (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  ativo_id uuid references gestao_ativos.ativos (id) on delete set null,
  colaborador_id uuid references public.colaboradores (id) on delete set null,
  gerado_por uuid references auth.users (id) on delete set null,
  status text not null default 'gerado',
  conteudo text,
  arquivo_url text,
  observacoes text,
  ativo_nome text,
  ativo_categoria text,
  ativo_marca text,
  ativo_modelo text,
  ativo_numero_serie text,
  ativo_patrimonio text,
  colaborador_nome text,
  colaborador_email text,
  colaborador_cpf text,
  unidade_nome text,
  departamento_nome text,
  gerado_em timestamptz not null default now(),
  assinado_em timestamptz,
  devolvido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint termos_posse_status_check check (status in ('gerado', 'assinado', 'cancelado', 'devolvido'))
);
create index if not exists idx_termos_posse_ativo_id
  on gestao_ativos.termos_posse (ativo_id);
create index if not exists idx_termos_posse_colaborador_id
  on gestao_ativos.termos_posse (colaborador_id);
create index if not exists idx_termos_posse_gerado_por
  on gestao_ativos.termos_posse (gerado_por);
create index if not exists idx_termos_posse_status
  on gestao_ativos.termos_posse (status);
create index if not exists idx_termos_posse_gerado_em
  on gestao_ativos.termos_posse (gerado_em desc);
drop trigger if exists trg_termos_posse_set_atualizado_em on gestao_ativos.termos_posse;
create trigger trg_termos_posse_set_atualizado_em
before update on gestao_ativos.termos_posse
for each row
execute function gestao_ativos.set_atualizado_em();
