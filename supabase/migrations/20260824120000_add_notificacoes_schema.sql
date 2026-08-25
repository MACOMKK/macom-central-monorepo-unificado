-- Novo schema transversal `notificacoes`, reutilizavel por qualquer app/Edge Function
-- (sem prefixo gestao_ porque nao ha app/SPA dono deste schema -- mesmo padrao de
-- infraestrutura sem UI usado por catalog-api/plataforma-api). Guarda filas de job de envio
-- (alto volume, uma linha por disparo, registro "morre" apos enviado), diferente de
-- public.push_subscriptions, que e um cadastro de identidade (baixo volume, uma linha por
-- dispositivo ate ser removida) e por isso continua em public.
create schema if not exists notificacoes;

create table notificacoes.fila_emails (
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

insert into notificacoes.fila_emails
select * from gestao_ativos.fila_emails;

create index idx_notificacoes_fila_emails_status
  on notificacoes.fila_emails (status);
create index idx_notificacoes_fila_emails_tipo
  on notificacoes.fila_emails (tipo);
create index idx_notificacoes_fila_emails_destinatario
  on notificacoes.fila_emails (destinatario);
create index idx_notificacoes_fila_emails_criado_em
  on notificacoes.fila_emails (criado_em desc);
create index idx_notificacoes_fila_emails_agendado_em
  on notificacoes.fila_emails (agendado_em asc);

-- Reaproveita a funcao ja existente em gestao_ativos (generica, sem dependencia de schema).
create trigger trg_fila_emails_set_atualizado_em
before update on notificacoes.fila_emails
for each row
execute function gestao_ativos.set_atualizado_em();

-- Fila antiga fica em gestao_ativos por historico (primeiro consumidor foi o termo de posse
-- do Central) -- agora que virou infraestrutura compartilhada, a tabela muda de schema.
drop table gestao_ativos.fila_emails cascade;

-- Apenas Edge Functions (service_role) leem/escrevem na fila -- nao ha acesso direto de
-- usuario final via frontend, entao nao ha RLS nem grant para authenticated.
grant usage on schema notificacoes to service_role;
grant select, insert, update, delete on all tables in schema notificacoes to service_role;
alter default privileges in schema notificacoes grant select, insert, update, delete on tables to service_role;
