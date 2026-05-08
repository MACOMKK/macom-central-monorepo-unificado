alter table if exists gestao_ativos.ativos
  add column if not exists unidade_id uuid references public.unidades (id) on delete set null,
  add column if not exists localizacao_interna text,
  add column if not exists observacao text;

create index if not exists idx_ativos_unidade_id on gestao_ativos.ativos (unidade_id);
