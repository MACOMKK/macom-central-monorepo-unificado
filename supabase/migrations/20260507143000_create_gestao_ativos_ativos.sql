create schema if not exists gestao_ativos;
create table if not exists gestao_ativos.ativos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text,
  marca text,
  modelo text,
  numero_serie text unique,
  patrimonio text unique,
  descricao text,
  status text not null default 'disponivel',
  estado text not null default 'bom',
  usuario_id uuid references auth.users (id) on delete set null,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  constraint ativos_status_check check (status in ('disponivel', 'em_uso', 'manutencao', 'descartado')),
  constraint ativos_estado_check check (estado in ('novo', 'bom', 'regular', 'ruim', 'inservivel'))
);
create index if not exists idx_ativos_nome on gestao_ativos.ativos (nome);
create index if not exists idx_ativos_status on gestao_ativos.ativos (status);
create index if not exists idx_ativos_usuario_id on gestao_ativos.ativos (usuario_id);
create or replace function gestao_ativos.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;
drop trigger if exists trg_ativos_set_atualizado_em on gestao_ativos.ativos;
create trigger trg_ativos_set_atualizado_em
before update on gestao_ativos.ativos
for each row
execute function gestao_ativos.set_atualizado_em();
