create table if not exists public.contatos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  nome text not null,
  empresa text,
  telefone text,
  email text,
  descricao text,
  unidade_id uuid references public.unidades (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint contatos_tipo_check check (tipo in ('fornecedor', 'suporte', 'parceiro', 'comercial', 'outro'))
);
create index if not exists idx_contatos_tipo
  on public.contatos (tipo);
create index if not exists idx_contatos_nome
  on public.contatos (nome);
create index if not exists idx_contatos_empresa
  on public.contatos (empresa);
create index if not exists idx_contatos_unidade_id
  on public.contatos (unidade_id);
drop trigger if exists trg_contatos_set_atualizado_em on public.contatos;
create trigger trg_contatos_set_atualizado_em
before update on public.contatos
for each row
execute function gestao_ativos.set_atualizado_em();
