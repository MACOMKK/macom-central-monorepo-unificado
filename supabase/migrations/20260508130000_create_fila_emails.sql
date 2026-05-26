create schema if not exists gestao_ativos;
create table if not exists gestao_ativos.fila_emails (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'termo_posse',
  destinatario text not null,
  assunto text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pendente',
  tentativas integer not null default 0,
  max_tentativas integer not null default 5,
  agendado_em timestamptz not null default now(),
  erro text,
  enviado_em timestamptz,
  processado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint fila_emails_status_check check (status in ('pendente', 'processando', 'enviado', 'erro', 'cancelado')),
  constraint fila_emails_tentativas_check check (tentativas >= 0),
  constraint fila_emails_max_tentativas_check check (max_tentativas >= 1)
);
create index if not exists idx_fila_emails_status
  on gestao_ativos.fila_emails (status);
create index if not exists idx_fila_emails_tipo
  on gestao_ativos.fila_emails (tipo);
create index if not exists idx_fila_emails_destinatario
  on gestao_ativos.fila_emails (destinatario);
create index if not exists idx_fila_emails_criado_em
  on gestao_ativos.fila_emails (criado_em desc);
create index if not exists idx_fila_emails_agendado_em
  on gestao_ativos.fila_emails (agendado_em asc);
drop trigger if exists trg_fila_emails_set_atualizado_em on gestao_ativos.fila_emails;
create trigger trg_fila_emails_set_atualizado_em
before update on gestao_ativos.fila_emails
for each row
execute function gestao_ativos.set_atualizado_em();
