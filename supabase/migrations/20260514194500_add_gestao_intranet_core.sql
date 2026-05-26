create extension if not exists pgcrypto;
create schema if not exists gestao_intranet;
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;
create or replace function public.current_colaborador_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.colaboradores c
  where c.id = auth.uid()
     or lower(c.email) = lower(auth.email())
  order by case when c.id = auth.uid() then 0 else 1 end
  limit 1;
$$;
insert into public.sistemas (slug, nome, descricao, ativo)
values ('intranet', 'Intranet', 'Comunicacao, conteudo e servicos internos da empresa', true)
on conflict (slug) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  ativo = excluded.ativo,
  atualizado_em = now();
create table if not exists gestao_intranet.perfis_colaboradores (
  colaborador_id uuid primary key references public.colaboradores(id) on delete cascade,
  foto_url text,
  data_nascimento date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.colaboradores(id) on delete set null
);
create table if not exists gestao_intranet.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null,
  categoria text not null default 'geral'
    check (categoria in ('geral', 'rh', 'ti', 'financeiro', 'vendas', 'pos_vendas')),
  prioridade text not null default 'media'
    check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  fixado boolean not null default false,
  expira_em date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.colaboradores(id) on delete set null
);
create table if not exists gestao_intranet.comentarios_avisos (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references gestao_intranet.avisos(id) on delete cascade,
  conteudo text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid not null references public.colaboradores(id) on delete cascade
);
create table if not exists gestao_intranet.reacoes_avisos (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references gestao_intranet.avisos(id) on delete cascade,
  emoji text not null
    check (emoji in ('like', 'love', 'surprised', 'laugh', 'clap')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid not null references public.colaboradores(id) on delete cascade,
  unique (aviso_id, criado_por, emoji)
);
create table if not exists gestao_intranet.eventos_calendario (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  data_evento date not null,
  horario text,
  tipo text not null default 'evento'
    check (tipo in ('reuniao', 'treinamento', 'evento', 'feriado', 'aniversario', 'outro')),
  local text,
  unidade_id uuid references public.unidades(id) on delete set null,
  departamento_id uuid references public.departamentos(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.colaboradores(id) on delete set null
);
create table if not exists gestao_intranet.documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  arquivo_url text,
  categoria text not null default 'outros'
    check (categoria in ('politica', 'procedimento', 'formulario', 'manual', 'treinamento', 'outros')),
  departamento_id uuid references public.departamentos(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.colaboradores(id) on delete set null
);
create table if not exists gestao_intranet.links_uteis (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  url text not null,
  descricao text,
  icone text,
  categoria text not null default 'sistema'
    check (categoria in ('sistema', 'ferramenta', 'portal', 'comunicacao', 'financeiro', 'rh')),
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.colaboradores(id) on delete set null
);
create table if not exists gestao_intranet.base_conhecimento (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null,
  categoria text not null default 'geral'
    check (categoria in ('geral', 'rh', 'ti', 'financeiro', 'vendas', 'pos_vendas', 'beneficios', 'politicas')),
  tipo text not null default 'faq'
    check (tipo in ('faq', 'artigo', 'tutorial', 'politica')),
  tags text[],
  fixado boolean not null default false,
  contador_util integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.colaboradores(id) on delete set null
);
create table if not exists gestao_intranet.feedback (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'sugestao'
    check (tipo in ('sugestao', 'feedback', 'reclamacao', 'elogio')),
  categoria text not null default 'geral'
    check (categoria in ('geral', 'rh', 'ti', 'financeiro', 'vendas', 'pos_vendas', 'infraestrutura', 'gestao')),
  titulo text not null,
  conteudo text not null,
  anonimo boolean not null default false,
  status text not null default 'pendente'
    check (status in ('pendente', 'em_analise', 'concluido', 'arquivado')),
  resposta_admin text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.colaboradores(id) on delete set null
);
create table if not exists gestao_intranet.permissoes_usuario (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null unique references public.colaboradores(id) on delete cascade,
  mod_avisos text not null default 'view' check (mod_avisos in ('none', 'view', 'edit')),
  mod_links text not null default 'view' check (mod_links in ('none', 'view', 'edit')),
  mod_colaboradores text not null default 'view' check (mod_colaboradores in ('none', 'view', 'edit')),
  mod_documentos text not null default 'view' check (mod_documentos in ('none', 'view', 'edit')),
  mod_calendario text not null default 'view' check (mod_calendario in ('none', 'view', 'edit')),
  mod_conhecimento text not null default 'view' check (mod_conhecimento in ('none', 'view', 'edit')),
  mod_feedback text not null default 'view' check (mod_feedback in ('none', 'view', 'edit')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.colaboradores(id) on delete set null
);
create index if not exists idx_intranet_perfis_data_nascimento
  on gestao_intranet.perfis_colaboradores (data_nascimento);
create index if not exists idx_intranet_avisos_categoria
  on gestao_intranet.avisos (categoria);
create index if not exists idx_intranet_avisos_prioridade
  on gestao_intranet.avisos (prioridade);
create index if not exists idx_intranet_avisos_fixado
  on gestao_intranet.avisos (fixado);
create index if not exists idx_intranet_avisos_criado_em
  on gestao_intranet.avisos (criado_em desc);
create index if not exists idx_intranet_comentarios_avisos_aviso_id
  on gestao_intranet.comentarios_avisos (aviso_id);
create index if not exists idx_intranet_reacoes_avisos_aviso_id
  on gestao_intranet.reacoes_avisos (aviso_id);
create index if not exists idx_intranet_eventos_calendario_data_evento
  on gestao_intranet.eventos_calendario (data_evento);
create index if not exists idx_intranet_eventos_calendario_tipo
  on gestao_intranet.eventos_calendario (tipo);
create index if not exists idx_intranet_documentos_categoria
  on gestao_intranet.documentos (categoria);
create index if not exists idx_intranet_documentos_departamento_id
  on gestao_intranet.documentos (departamento_id);
create index if not exists idx_intranet_links_uteis_categoria
  on gestao_intranet.links_uteis (categoria);
create index if not exists idx_intranet_links_uteis_ordem
  on gestao_intranet.links_uteis (ordem);
create index if not exists idx_intranet_base_conhecimento_categoria
  on gestao_intranet.base_conhecimento (categoria);
create index if not exists idx_intranet_base_conhecimento_fixado
  on gestao_intranet.base_conhecimento (fixado);
create index if not exists idx_intranet_feedback_status
  on gestao_intranet.feedback (status);
create index if not exists idx_intranet_feedback_tipo
  on gestao_intranet.feedback (tipo);
create index if not exists idx_intranet_permissoes_usuario_colaborador_id
  on gestao_intranet.permissoes_usuario (colaborador_id);
drop trigger if exists trg_intranet_perfis_colaboradores_set_updated_at on gestao_intranet.perfis_colaboradores;
create trigger trg_intranet_perfis_colaboradores_set_updated_at
before update on gestao_intranet.perfis_colaboradores
for each row
execute function public.set_updated_at();
drop trigger if exists trg_intranet_avisos_set_updated_at on gestao_intranet.avisos;
create trigger trg_intranet_avisos_set_updated_at
before update on gestao_intranet.avisos
for each row
execute function public.set_updated_at();
drop trigger if exists trg_intranet_comentarios_avisos_set_updated_at on gestao_intranet.comentarios_avisos;
create trigger trg_intranet_comentarios_avisos_set_updated_at
before update on gestao_intranet.comentarios_avisos
for each row
execute function public.set_updated_at();
drop trigger if exists trg_intranet_reacoes_avisos_set_updated_at on gestao_intranet.reacoes_avisos;
create trigger trg_intranet_reacoes_avisos_set_updated_at
before update on gestao_intranet.reacoes_avisos
for each row
execute function public.set_updated_at();
drop trigger if exists trg_intranet_eventos_calendario_set_updated_at on gestao_intranet.eventos_calendario;
create trigger trg_intranet_eventos_calendario_set_updated_at
before update on gestao_intranet.eventos_calendario
for each row
execute function public.set_updated_at();
drop trigger if exists trg_intranet_documentos_set_updated_at on gestao_intranet.documentos;
create trigger trg_intranet_documentos_set_updated_at
before update on gestao_intranet.documentos
for each row
execute function public.set_updated_at();
drop trigger if exists trg_intranet_links_uteis_set_updated_at on gestao_intranet.links_uteis;
create trigger trg_intranet_links_uteis_set_updated_at
before update on gestao_intranet.links_uteis
for each row
execute function public.set_updated_at();
drop trigger if exists trg_intranet_base_conhecimento_set_updated_at on gestao_intranet.base_conhecimento;
create trigger trg_intranet_base_conhecimento_set_updated_at
before update on gestao_intranet.base_conhecimento
for each row
execute function public.set_updated_at();
drop trigger if exists trg_intranet_feedback_set_updated_at on gestao_intranet.feedback;
create trigger trg_intranet_feedback_set_updated_at
before update on gestao_intranet.feedback
for each row
execute function public.set_updated_at();
drop trigger if exists trg_intranet_permissoes_usuario_set_updated_at on gestao_intranet.permissoes_usuario;
create trigger trg_intranet_permissoes_usuario_set_updated_at
before update on gestao_intranet.permissoes_usuario
for each row
execute function public.set_updated_at();
create or replace function public.intranet_access_level()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select aus.nivel_acesso
  from public.acessos_usuario_sistema aus
  join public.sistemas s on s.id = aus.sistema_id
  where aus.colaborador_id = public.current_colaborador_id()
    and aus.ativo = true
    and s.slug = 'intranet'
    and s.ativo = true
  limit 1;
$$;
create or replace function public.intranet_has_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.intranet_access_level() in ('admin', 'gestor', 'usuario'), false);
$$;
create or replace function public.intranet_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.intranet_access_level() = 'admin';
$$;
create or replace function public.intranet_module_permission(module_name text)
returns text
language sql
stable
security definer
set search_path = public, gestao_intranet
as $$
  select case module_name
    when 'avisos' then coalesce(pu.mod_avisos, 'view')
    when 'links' then coalesce(pu.mod_links, 'view')
    when 'colaboradores' then coalesce(pu.mod_colaboradores, 'view')
    when 'documentos' then coalesce(pu.mod_documentos, 'view')
    when 'calendario' then coalesce(pu.mod_calendario, 'view')
    when 'conhecimento' then coalesce(pu.mod_conhecimento, 'view')
    when 'feedback' then coalesce(pu.mod_feedback, 'view')
    else 'none'
  end
  from (select public.current_colaborador_id() as colaborador_id) current_context
  left join gestao_intranet.permissoes_usuario pu
    on pu.colaborador_id = current_context.colaborador_id;
$$;
create or replace function public.intranet_can_view_module(module_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.intranet_has_access() and public.intranet_module_permission(module_name) <> 'none';
$$;
create or replace function public.intranet_can_edit_module(module_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.intranet_is_admin()
    or (public.intranet_has_access() and public.intranet_module_permission(module_name) = 'edit');
$$;
alter table gestao_intranet.perfis_colaboradores enable row level security;
alter table gestao_intranet.avisos enable row level security;
alter table gestao_intranet.comentarios_avisos enable row level security;
alter table gestao_intranet.reacoes_avisos enable row level security;
alter table gestao_intranet.eventos_calendario enable row level security;
alter table gestao_intranet.documentos enable row level security;
alter table gestao_intranet.links_uteis enable row level security;
alter table gestao_intranet.base_conhecimento enable row level security;
alter table gestao_intranet.feedback enable row level security;
alter table gestao_intranet.permissoes_usuario enable row level security;
drop policy if exists "intranet_perfis_colaboradores_select" on gestao_intranet.perfis_colaboradores;
create policy "intranet_perfis_colaboradores_select"
  on gestao_intranet.perfis_colaboradores
  for select
  to authenticated
  using (public.intranet_can_view_module('colaboradores'));
drop policy if exists "intranet_perfis_colaboradores_manage" on gestao_intranet.perfis_colaboradores;
create policy "intranet_perfis_colaboradores_manage"
  on gestao_intranet.perfis_colaboradores
  for all
  to authenticated
  using (public.intranet_can_edit_module('colaboradores'))
  with check (public.intranet_can_edit_module('colaboradores'));
drop policy if exists "intranet_avisos_select" on gestao_intranet.avisos;
create policy "intranet_avisos_select"
  on gestao_intranet.avisos
  for select
  to authenticated
  using (public.intranet_can_view_module('avisos'));
drop policy if exists "intranet_avisos_manage" on gestao_intranet.avisos;
create policy "intranet_avisos_manage"
  on gestao_intranet.avisos
  for all
  to authenticated
  using (public.intranet_can_edit_module('avisos'))
  with check (public.intranet_can_edit_module('avisos'));
drop policy if exists "intranet_comentarios_avisos_select" on gestao_intranet.comentarios_avisos;
create policy "intranet_comentarios_avisos_select"
  on gestao_intranet.comentarios_avisos
  for select
  to authenticated
  using (public.intranet_can_view_module('avisos'));
drop policy if exists "intranet_comentarios_avisos_insert" on gestao_intranet.comentarios_avisos;
create policy "intranet_comentarios_avisos_insert"
  on gestao_intranet.comentarios_avisos
  for insert
  to authenticated
  with check (
    public.intranet_can_view_module('avisos')
    and criado_por = public.current_colaborador_id()
  );
drop policy if exists "intranet_comentarios_avisos_update_delete" on gestao_intranet.comentarios_avisos;
create policy "intranet_comentarios_avisos_update_delete"
  on gestao_intranet.comentarios_avisos
  for all
  to authenticated
  using (
    public.intranet_is_admin()
    or criado_por = public.current_colaborador_id()
  )
  with check (
    public.intranet_is_admin()
    or criado_por = public.current_colaborador_id()
  );
drop policy if exists "intranet_reacoes_avisos_select" on gestao_intranet.reacoes_avisos;
create policy "intranet_reacoes_avisos_select"
  on gestao_intranet.reacoes_avisos
  for select
  to authenticated
  using (public.intranet_can_view_module('avisos'));
drop policy if exists "intranet_reacoes_avisos_insert" on gestao_intranet.reacoes_avisos;
create policy "intranet_reacoes_avisos_insert"
  on gestao_intranet.reacoes_avisos
  for insert
  to authenticated
  with check (
    public.intranet_can_view_module('avisos')
    and criado_por = public.current_colaborador_id()
  );
drop policy if exists "intranet_reacoes_avisos_delete" on gestao_intranet.reacoes_avisos;
create policy "intranet_reacoes_avisos_delete"
  on gestao_intranet.reacoes_avisos
  for delete
  to authenticated
  using (
    public.intranet_is_admin()
    or criado_por = public.current_colaborador_id()
  );
drop policy if exists "intranet_eventos_calendario_select" on gestao_intranet.eventos_calendario;
create policy "intranet_eventos_calendario_select"
  on gestao_intranet.eventos_calendario
  for select
  to authenticated
  using (public.intranet_can_view_module('calendario'));
drop policy if exists "intranet_eventos_calendario_manage" on gestao_intranet.eventos_calendario;
create policy "intranet_eventos_calendario_manage"
  on gestao_intranet.eventos_calendario
  for all
  to authenticated
  using (public.intranet_can_edit_module('calendario'))
  with check (public.intranet_can_edit_module('calendario'));
drop policy if exists "intranet_documentos_select" on gestao_intranet.documentos;
create policy "intranet_documentos_select"
  on gestao_intranet.documentos
  for select
  to authenticated
  using (public.intranet_can_view_module('documentos'));
drop policy if exists "intranet_documentos_manage" on gestao_intranet.documentos;
create policy "intranet_documentos_manage"
  on gestao_intranet.documentos
  for all
  to authenticated
  using (public.intranet_can_edit_module('documentos'))
  with check (public.intranet_can_edit_module('documentos'));
drop policy if exists "intranet_links_uteis_select" on gestao_intranet.links_uteis;
create policy "intranet_links_uteis_select"
  on gestao_intranet.links_uteis
  for select
  to authenticated
  using (public.intranet_can_view_module('links'));
drop policy if exists "intranet_links_uteis_manage" on gestao_intranet.links_uteis;
create policy "intranet_links_uteis_manage"
  on gestao_intranet.links_uteis
  for all
  to authenticated
  using (public.intranet_can_edit_module('links'))
  with check (public.intranet_can_edit_module('links'));
drop policy if exists "intranet_base_conhecimento_select" on gestao_intranet.base_conhecimento;
create policy "intranet_base_conhecimento_select"
  on gestao_intranet.base_conhecimento
  for select
  to authenticated
  using (public.intranet_can_view_module('conhecimento'));
drop policy if exists "intranet_base_conhecimento_manage" on gestao_intranet.base_conhecimento;
create policy "intranet_base_conhecimento_manage"
  on gestao_intranet.base_conhecimento
  for all
  to authenticated
  using (public.intranet_can_edit_module('conhecimento'))
  with check (public.intranet_can_edit_module('conhecimento'));
drop policy if exists "intranet_feedback_select" on gestao_intranet.feedback;
create policy "intranet_feedback_select"
  on gestao_intranet.feedback
  for select
  to authenticated
  using (
    public.intranet_can_edit_module('feedback')
    or criado_por = public.current_colaborador_id()
  );
drop policy if exists "intranet_feedback_insert" on gestao_intranet.feedback;
create policy "intranet_feedback_insert"
  on gestao_intranet.feedback
  for insert
  to authenticated
  with check (
    public.intranet_has_access()
    and criado_por = public.current_colaborador_id()
  );
drop policy if exists "intranet_feedback_update" on gestao_intranet.feedback;
create policy "intranet_feedback_update"
  on gestao_intranet.feedback
  for update
  to authenticated
  using (public.intranet_can_edit_module('feedback'))
  with check (public.intranet_can_edit_module('feedback'));
drop policy if exists "intranet_permissoes_usuario_select" on gestao_intranet.permissoes_usuario;
create policy "intranet_permissoes_usuario_select"
  on gestao_intranet.permissoes_usuario
  for select
  to authenticated
  using (
    public.intranet_is_admin()
    or colaborador_id = public.current_colaborador_id()
  );
drop policy if exists "intranet_permissoes_usuario_manage" on gestao_intranet.permissoes_usuario;
create policy "intranet_permissoes_usuario_manage"
  on gestao_intranet.permissoes_usuario
  for all
  to authenticated
  using (public.intranet_is_admin())
  with check (public.intranet_is_admin());
grant usage on schema gestao_intranet to authenticated;
grant usage on schema gestao_intranet to service_role;
grant select, insert, update, delete on all tables in schema gestao_intranet to authenticated;
grant select, insert, update, delete on all tables in schema gestao_intranet to service_role;
alter default privileges in schema gestao_intranet
grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema gestao_intranet
grant select, insert, update, delete on tables to service_role;
notify pgrst, 'reload schema';
