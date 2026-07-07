-- v1 (MVP) do app "comunicacao": canais fixos + mensagens em tempo real.
-- Fora de escopo nesta migration (v2, quando necessário): membros_canal (restrição de acesso
-- por canal), conversas_diretas/participantes_conversa/mensagens_diretas (DM), anexos_mensagem,
-- leituras_mensagem (read receipts), presenca. push_subscriptions entra agora (mesma forma do
-- precedente em gestao_intranet), mas sem envio real de push.

create extension if not exists pgcrypto;

create schema if not exists gestao_comunicacao;

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
values ('comunicacao', 'Comunicação', 'Chat interno corporativo em tempo real', true)
on conflict (slug) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  ativo = excluded.ativo,
  atualizado_em = now();

create table if not exists gestao_comunicacao.canais (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  descricao text,
  icone text,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.colaboradores(id) on delete set null
);

create table if not exists gestao_comunicacao.mensagens (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid not null references gestao_comunicacao.canais(id) on delete cascade,
  autor_id uuid not null references public.colaboradores(id) on delete cascade,
  conteudo text not null
    check (char_length(btrim(conteudo)) > 0 and char_length(conteudo) <= 4000),
  editada_em timestamptz,
  excluida_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_comunicacao.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time timestamptz,
  user_agent text,
  ativo boolean not null default true,
  ultimo_uso_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_comunicacao_canais_ativo_ordem
  on gestao_comunicacao.canais (ativo, ordem);

create index if not exists idx_comunicacao_mensagens_canal_criado_em
  on gestao_comunicacao.mensagens (canal_id, criado_em desc);

create index if not exists idx_comunicacao_mensagens_autor_id
  on gestao_comunicacao.mensagens (autor_id);

create index if not exists idx_comunicacao_push_subscriptions_colaborador_id
  on gestao_comunicacao.push_subscriptions (colaborador_id);

drop trigger if exists trg_comunicacao_canais_set_updated_at on gestao_comunicacao.canais;
create trigger trg_comunicacao_canais_set_updated_at
before update on gestao_comunicacao.canais
for each row
execute function public.set_updated_at();

drop trigger if exists trg_comunicacao_mensagens_set_updated_at on gestao_comunicacao.mensagens;
create trigger trg_comunicacao_mensagens_set_updated_at
before update on gestao_comunicacao.mensagens
for each row
execute function public.set_updated_at();

drop trigger if exists trg_comunicacao_push_subscriptions_set_updated_at on gestao_comunicacao.push_subscriptions;
create trigger trg_comunicacao_push_subscriptions_set_updated_at
before update on gestao_comunicacao.push_subscriptions
for each row
execute function public.set_updated_at();

insert into gestao_comunicacao.canais (slug, nome, ordem)
values
  ('geral', 'Geral', 1),
  ('comercial', 'Comercial', 2),
  ('financeiro', 'Financeiro', 3),
  ('instalacao', 'Instalação', 4),
  ('suporte', 'Suporte', 5),
  ('diretoria', 'Diretoria', 6)
on conflict (slug) do nothing;

create or replace function public.comunicacao_access_level()
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
    and s.slug = 'comunicacao'
    and s.ativo = true
  limit 1;
$$;

create or replace function public.comunicacao_has_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.comunicacao_access_level() in ('admin', 'gestor', 'usuario'), false);
$$;

create or replace function public.comunicacao_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.comunicacao_access_level() = 'admin', false);
$$;

-- v1: todo canal ativo é acessível a quem tem acesso ao sistema. Mantida como função dedicada
-- (em vez de inlinear comunicacao_has_access() nas policies de mensagens) para que v2 possa
-- trocar a implementação por checagem em membros_canal sem alterar as policies.
create or replace function public.comunicacao_can_access_canal(p_canal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.comunicacao_has_access()
     and exists (
       select 1
       from gestao_comunicacao.canais c
       where c.id = p_canal_id
         and c.ativo
     );
$$;

alter table gestao_comunicacao.canais enable row level security;
alter table gestao_comunicacao.mensagens enable row level security;
alter table gestao_comunicacao.push_subscriptions enable row level security;

drop policy if exists "comunicacao_canais_select" on gestao_comunicacao.canais;
create policy "comunicacao_canais_select"
  on gestao_comunicacao.canais
  for select
  to authenticated
  using (public.comunicacao_has_access());

drop policy if exists "comunicacao_canais_manage" on gestao_comunicacao.canais;
create policy "comunicacao_canais_manage"
  on gestao_comunicacao.canais
  for all
  to authenticated
  using (public.comunicacao_is_admin())
  with check (public.comunicacao_is_admin());

drop policy if exists "comunicacao_mensagens_select" on gestao_comunicacao.mensagens;
create policy "comunicacao_mensagens_select"
  on gestao_comunicacao.mensagens
  for select
  to authenticated
  using (public.comunicacao_can_access_canal(canal_id));

drop policy if exists "comunicacao_mensagens_insert" on gestao_comunicacao.mensagens;
create policy "comunicacao_mensagens_insert"
  on gestao_comunicacao.mensagens
  for insert
  to authenticated
  with check (
    autor_id = public.current_colaborador_id()
    and public.comunicacao_can_access_canal(canal_id)
  );

-- Edição e exclusão (soft-delete via excluida_em) são sempre um UPDATE do próprio autor.
-- Não há policy de DELETE: exclusão real de mensagem é bloqueada pela RLS, não só pela edge function.
drop policy if exists "comunicacao_mensagens_update_own" on gestao_comunicacao.mensagens;
create policy "comunicacao_mensagens_update_own"
  on gestao_comunicacao.mensagens
  for update
  to authenticated
  using (autor_id = public.current_colaborador_id())
  with check (autor_id = public.current_colaborador_id());

drop policy if exists "comunicacao_push_subscriptions_self" on gestao_comunicacao.push_subscriptions;
create policy "comunicacao_push_subscriptions_self"
  on gestao_comunicacao.push_subscriptions
  for all
  to authenticated
  using (colaborador_id = public.current_colaborador_id())
  with check (colaborador_id = public.current_colaborador_id());

grant usage on schema gestao_comunicacao to authenticated;
grant usage on schema gestao_comunicacao to service_role;
grant select, insert, update, delete on all tables in schema gestao_comunicacao to authenticated;
grant select, insert, update, delete on all tables in schema gestao_comunicacao to service_role;

alter default privileges in schema gestao_comunicacao
grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema gestao_comunicacao
grant select, insert, update, delete on tables to service_role;

notify pgrst, 'reload schema';
