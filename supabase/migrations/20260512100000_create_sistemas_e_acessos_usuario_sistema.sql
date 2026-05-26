create table if not exists public.sistemas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create table if not exists public.acessos_usuario_sistema (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  sistema_id uuid not null references public.sistemas(id) on delete cascade,
  nivel_acesso text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint acessos_usuario_sistema_nivel_acesso_check
    check (nivel_acesso in ('admin', 'gestor', 'usuario')),
  constraint acessos_usuario_sistema_colaborador_sistema_unique
    unique (colaborador_id, sistema_id)
);
create index if not exists idx_sistemas_slug
  on public.sistemas (slug);
create index if not exists idx_sistemas_ativo
  on public.sistemas (ativo);
create index if not exists idx_acessos_usuario_sistema_colaborador_id
  on public.acessos_usuario_sistema (colaborador_id);
create index if not exists idx_acessos_usuario_sistema_sistema_id
  on public.acessos_usuario_sistema (sistema_id);
create index if not exists idx_acessos_usuario_sistema_ativo
  on public.acessos_usuario_sistema (ativo);
drop trigger if exists trg_sistemas_set_atualizado_em on public.sistemas;
create trigger trg_sistemas_set_atualizado_em
before update on public.sistemas
for each row
execute function gestao_ativos.set_atualizado_em();
drop trigger if exists trg_acessos_usuario_sistema_set_atualizado_em on public.acessos_usuario_sistema;
create trigger trg_acessos_usuario_sistema_set_atualizado_em
before update on public.acessos_usuario_sistema
for each row
execute function gestao_ativos.set_atualizado_em();
insert into public.sistemas (slug, nome, descricao, ativo)
values
  ('central', 'Central', 'Sistema central de usuarios, catalogo e administracao', true),
  ('relatorios', 'Relatorios', 'Portal de relatorios corporativos', true),
  ('pagamentos', 'Pagamentos', 'Solicitacoes e fluxo de pagamentos', true),
  ('intranet', 'Intranet', 'Comunicacao e conteudo interno', true),
  ('rh', 'RH', 'Recursos humanos', true)
on conflict (slug) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  ativo = excluded.ativo,
  atualizado_em = now();
