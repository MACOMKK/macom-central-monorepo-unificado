create table if not exists gestao_ativos.ativos_historico_posse (
  id uuid primary key default gen_random_uuid(),
  ativo_id uuid not null references gestao_ativos.ativos (id) on delete cascade,
  colaborador_anterior_id uuid references public.colaboradores (id) on delete set null,
  colaborador_novo_id uuid references public.colaboradores (id) on delete set null,
  alterado_por uuid references auth.users (id) on delete set null,
  alterado_em timestamptz not null default now()
);
create index if not exists idx_ativos_historico_posse_ativo_id
  on gestao_ativos.ativos_historico_posse (ativo_id);
create index if not exists idx_ativos_historico_posse_alterado_em
  on gestao_ativos.ativos_historico_posse (alterado_em desc);
