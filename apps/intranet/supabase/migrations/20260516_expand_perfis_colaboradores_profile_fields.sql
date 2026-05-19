alter table gestao_intranet.perfis_colaboradores
  add column if not exists bio text,
  add column if not exists frase_status text,
  add column if not exists linkedin_url text,
  add column if not exists whatsapp_url text,
  add column if not exists localizacao_interna text,
  add column if not exists habilidades text[] not null default '{}',
  add column if not exists interesses text[] not null default '{}',
  add column if not exists preferencias jsonb not null default '{}'::jsonb;
