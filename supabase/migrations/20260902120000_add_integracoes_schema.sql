-- Schema generico para configuracao de integracoes externas (Gmail, e no futuro
-- WhatsApp API, SMS, outros provedores), pensado para ser consumido por qualquer
-- *-api via service role, sem dono de dominio especifico (mesmo espirito de
-- notificacoes.fila_emails). Tela de administracao fica no Console (apps/admin).
--
-- Modelo: dados nao sensiveis (client_id, remetente, escopos, flags) vivem em
-- `integracoes.integracoes.config` (jsonb); valores sensiveis (client_secret,
-- refresh_token, api_key, etc.) sao guardados no Supabase Vault e referenciados
-- em `integracoes.integracoes_secrets` -- mesmo padrao ja usado em
-- gestao_intranet.integracoes_google_calendar (ver migration
-- 20260827100000_move_google_calendar_refresh_token_to_vault.sql). Nenhum valor
-- sensivel e' armazenado em texto puro nas tabelas.

create schema if not exists integracoes;

create table integracoes.integracoes (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  provider text not null,
  descricao text,
  ativo boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.colaboradores (id)
);

comment on table integracoes.integracoes is
  'Configuracao generica de integracoes externas. `chave` identifica a instancia '
  '(ex.: gmail_notificacoes, google_calendar); `config` guarda apenas campos nao '
  'sensiveis. Valores sensiveis ficam em integracoes.integracoes_secrets + Vault.';
comment on column integracoes.integracoes.chave is
  'Identificador estavel usado pelas Edge Functions para buscar a config (ex.: gmail_notificacoes).';
comment on column integracoes.integracoes.provider is
  'Nome do provedor/tipo de integracao (ex.: gmail, google_calendar, whatsapp_api).';
comment on column integracoes.integracoes.config is
  'Campos de configuracao NAO sensiveis (client_id, remetente, escopos, flags). Nunca guardar segredo aqui.';

create table integracoes.integracoes_secrets (
  id uuid primary key default gen_random_uuid(),
  integracao_id uuid not null references integracoes.integracoes (id) on delete cascade,
  chave text not null,
  secret_id uuid not null references vault.secrets (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (integracao_id, chave)
);

comment on table integracoes.integracoes_secrets is
  'Referencias a valores sensiveis de cada integracao (ex.: client_secret, refresh_token), '
  'guardados de fato no Supabase Vault (vault.secrets). Ler via vault.decrypted_secrets.';
comment on column integracoes.integracoes_secrets.chave is
  'Nome do campo sensivel dentro da integracao (ex.: client_secret, refresh_token, api_key).';

create index integracoes_integracoes_secrets_integracao_id_idx
  on integracoes.integracoes_secrets (integracao_id);

create trigger integracoes_integracoes_set_atualizado_em
  before update on integracoes.integracoes
  for each row execute function gestao_ativos.set_atualizado_em();

create trigger integracoes_integracoes_secrets_set_atualizado_em
  before update on integracoes.integracoes_secrets
  for each row execute function gestao_ativos.set_atualizado_em();

-- RLS habilitado sem nenhuma policy: acesso exclusivo via service role
-- (Edge Functions), nunca direto do client. Mesma postura de dados
-- sensiveis usada para o restante do schema notificacoes/vault.
alter table integracoes.integracoes enable row level security;
alter table integracoes.integracoes_secrets enable row level security;

revoke all on integracoes.integracoes from anon, authenticated;
revoke all on integracoes.integracoes_secrets from anon, authenticated;
