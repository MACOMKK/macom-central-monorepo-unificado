-- v2 do app "comunicacao": mensagens diretas (DM). Ver comentario em
-- 20260707130000_add_gestao_comunicacao_core.sql que ja antecipava este trabalho.

create table if not exists gestao_comunicacao.conversas_diretas (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  ultima_mensagem_em timestamptz
);

create table if not exists gestao_comunicacao.participantes_conversa (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references gestao_comunicacao.conversas_diretas(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (conversa_id, colaborador_id)
);

create table if not exists gestao_comunicacao.mensagens_diretas (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references gestao_comunicacao.conversas_diretas(id) on delete cascade,
  autor_id uuid not null references public.colaboradores(id) on delete cascade,
  conteudo text not null
    check (char_length(btrim(conteudo)) > 0 and char_length(conteudo) <= 4000),
  editada_em timestamptz,
  excluida_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_comunicacao_participantes_colaborador
  on gestao_comunicacao.participantes_conversa (colaborador_id);

create index if not exists idx_comunicacao_participantes_conversa
  on gestao_comunicacao.participantes_conversa (conversa_id);

create index if not exists idx_comunicacao_mensagens_diretas_conversa_criado_em
  on gestao_comunicacao.mensagens_diretas (conversa_id, criado_em desc);

create index if not exists idx_comunicacao_mensagens_diretas_autor_id
  on gestao_comunicacao.mensagens_diretas (autor_id);

create index if not exists idx_comunicacao_conversas_diretas_ultima_mensagem
  on gestao_comunicacao.conversas_diretas (ultima_mensagem_em desc nulls last);

drop trigger if exists trg_comunicacao_conversas_diretas_set_updated_at on gestao_comunicacao.conversas_diretas;
create trigger trg_comunicacao_conversas_diretas_set_updated_at
before update on gestao_comunicacao.conversas_diretas
for each row
execute function public.set_updated_at();

drop trigger if exists trg_comunicacao_mensagens_diretas_set_updated_at on gestao_comunicacao.mensagens_diretas;
create trigger trg_comunicacao_mensagens_diretas_set_updated_at
before update on gestao_comunicacao.mensagens_diretas
for each row
execute function public.set_updated_at();

-- Mantem conversas_diretas.ultima_mensagem_em atualizada para ordenar a lista de conversas
-- na sidebar sem depender de subquery agregada a cada listagem.
create or replace function public.comunicacao_touch_conversa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update gestao_comunicacao.conversas_diretas
  set ultima_mensagem_em = new.criado_em
  where id = new.conversa_id;
  return new;
end;
$$;

drop trigger if exists trg_comunicacao_mensagens_diretas_touch_conversa on gestao_comunicacao.mensagens_diretas;
create trigger trg_comunicacao_mensagens_diretas_touch_conversa
after insert on gestao_comunicacao.mensagens_diretas
for each row
execute function public.comunicacao_touch_conversa();

-- Mesmo espirito de comunicacao_can_access_canal: indirecao dedicada para poder evoluir a
-- regra de acesso (ex: bloquear conversa com colaborador inativo) sem alterar as policies.
create or replace function public.comunicacao_can_access_conversa(p_conversa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.comunicacao_has_access()
     and exists (
       select 1
       from gestao_comunicacao.participantes_conversa pc
       where pc.conversa_id = p_conversa_id
         and pc.colaborador_id = public.current_colaborador_id()
     );
$$;

alter table gestao_comunicacao.conversas_diretas enable row level security;
alter table gestao_comunicacao.participantes_conversa enable row level security;
alter table gestao_comunicacao.mensagens_diretas enable row level security;

drop policy if exists "comunicacao_conversas_select" on gestao_comunicacao.conversas_diretas;
create policy "comunicacao_conversas_select"
  on gestao_comunicacao.conversas_diretas
  for select
  to authenticated
  using (public.comunicacao_can_access_conversa(id));

-- A criacao real de conversas acontece via Edge Function (conexao privilegiada com
-- DATABASE_URL); esta policy e defesa em profundidade para o caso de acesso direto via
-- supabase-js client-side.
drop policy if exists "comunicacao_conversas_insert" on gestao_comunicacao.conversas_diretas;
create policy "comunicacao_conversas_insert"
  on gestao_comunicacao.conversas_diretas
  for insert
  to authenticated
  with check (public.comunicacao_has_access());

drop policy if exists "comunicacao_participantes_select" on gestao_comunicacao.participantes_conversa;
create policy "comunicacao_participantes_select"
  on gestao_comunicacao.participantes_conversa
  for select
  to authenticated
  using (public.comunicacao_can_access_conversa(conversa_id));

drop policy if exists "comunicacao_participantes_insert" on gestao_comunicacao.participantes_conversa;
create policy "comunicacao_participantes_insert"
  on gestao_comunicacao.participantes_conversa
  for insert
  to authenticated
  with check (public.comunicacao_has_access());

drop policy if exists "comunicacao_mensagens_diretas_select" on gestao_comunicacao.mensagens_diretas;
create policy "comunicacao_mensagens_diretas_select"
  on gestao_comunicacao.mensagens_diretas
  for select
  to authenticated
  using (public.comunicacao_can_access_conversa(conversa_id));

drop policy if exists "comunicacao_mensagens_diretas_insert" on gestao_comunicacao.mensagens_diretas;
create policy "comunicacao_mensagens_diretas_insert"
  on gestao_comunicacao.mensagens_diretas
  for insert
  to authenticated
  with check (
    autor_id = public.current_colaborador_id()
    and public.comunicacao_can_access_conversa(conversa_id)
  );

-- Edicao e exclusao (soft-delete via excluida_em) sao sempre um UPDATE do proprio autor.
-- Nao ha policy de DELETE: exclusao real de mensagem e bloqueada pela RLS, mesmo padrao de mensagens.
drop policy if exists "comunicacao_mensagens_diretas_update_own" on gestao_comunicacao.mensagens_diretas;
create policy "comunicacao_mensagens_diretas_update_own"
  on gestao_comunicacao.mensagens_diretas
  for update
  to authenticated
  using (autor_id = public.current_colaborador_id())
  with check (autor_id = public.current_colaborador_id());

grant select, insert, update, delete on all tables in schema gestao_comunicacao to authenticated;
grant select, insert, update, delete on all tables in schema gestao_comunicacao to service_role;

alter table gestao_comunicacao.conversas_diretas replica identity full;
alter table gestao_comunicacao.participantes_conversa replica identity full;
alter table gestao_comunicacao.mensagens_diretas replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_comunicacao'
      and tablename = 'conversas_diretas'
  ) then
    alter publication supabase_realtime add table gestao_comunicacao.conversas_diretas;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_comunicacao'
      and tablename = 'participantes_conversa'
  ) then
    alter publication supabase_realtime add table gestao_comunicacao.participantes_conversa;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_comunicacao'
      and tablename = 'mensagens_diretas'
  ) then
    alter publication supabase_realtime add table gestao_comunicacao.mensagens_diretas;
  end if;
end
$$;

notify pgrst, 'reload schema';
