create schema if not exists gestao_ativos;
create table if not exists gestao_ativos.linhas_corporativas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  nome text not null,
  numero text not null,
  operadora text,
  iccid text,
  plano text,
  status text not null default 'disponivel',
  unidade_id uuid references public.unidades (id) on delete set null,
  colaborador_id uuid references public.colaboradores (id) on delete set null,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint linhas_corporativas_tipo_check check (tipo in ('chip', 'linha_movel', 'telefone_fixo', 'ramal', 'outro')),
  constraint linhas_corporativas_status_check check (status in ('disponivel', 'em_uso', 'inativo', 'cancelado'))
);
create index if not exists idx_linhas_corporativas_tipo
  on gestao_ativos.linhas_corporativas (tipo);
create index if not exists idx_linhas_corporativas_numero
  on gestao_ativos.linhas_corporativas (numero);
create index if not exists idx_linhas_corporativas_status
  on gestao_ativos.linhas_corporativas (status);
create index if not exists idx_linhas_corporativas_unidade_id
  on gestao_ativos.linhas_corporativas (unidade_id);
create index if not exists idx_linhas_corporativas_colaborador_id
  on gestao_ativos.linhas_corporativas (colaborador_id);
drop trigger if exists trg_linhas_corporativas_set_atualizado_em on gestao_ativos.linhas_corporativas;
create trigger trg_linhas_corporativas_set_atualizado_em
before update on gestao_ativos.linhas_corporativas
for each row
execute function gestao_ativos.set_atualizado_em();
