-- v2 do app "comunicacao": membership restrita por canal. Ver comentario em
-- 20260707130000_add_gestao_comunicacao_core.sql que ja antecipava este trabalho
-- (comunicacao_can_access_canal foi desenhada para trocar de implementacao sem
-- alterar nenhuma RLS policy).

create table if not exists gestao_comunicacao.membros_canal (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid not null references gestao_comunicacao.canais(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (canal_id, colaborador_id)
);

create index if not exists idx_comunicacao_membros_canal_canal
  on gestao_comunicacao.membros_canal (canal_id);

create index if not exists idx_comunicacao_membros_canal_colaborador
  on gestao_comunicacao.membros_canal (colaborador_id);

-- Sem backfill: nenhuma linha e inserida aqui para os canais/usuarios existentes.
-- A partir desta migration, todo colaborador precisa entrar explicitamente em cada
-- canal (inclusive os 6 canais fixos do seed) para voltar a ver suas mensagens.
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
     )
     and exists (
       select 1
       from gestao_comunicacao.membros_canal m
       where m.canal_id = p_canal_id
         and m.colaborador_id = public.current_colaborador_id()
     );
$$;

alter table gestao_comunicacao.membros_canal enable row level security;

drop policy if exists "comunicacao_membros_canal_select" on gestao_comunicacao.membros_canal;
create policy "comunicacao_membros_canal_select"
  on gestao_comunicacao.membros_canal
  for select
  to authenticated
  using (public.comunicacao_can_access_canal(canal_id));

-- A entrada/saida real acontece via Edge Function (conexao privilegiada com
-- DATABASE_URL); estas policies sao defesa em profundidade para o caso de acesso
-- direto via supabase-js client-side.
drop policy if exists "comunicacao_membros_canal_insert" on gestao_comunicacao.membros_canal;
create policy "comunicacao_membros_canal_insert"
  on gestao_comunicacao.membros_canal
  for insert
  to authenticated
  with check (colaborador_id = public.current_colaborador_id() and public.comunicacao_has_access());

drop policy if exists "comunicacao_membros_canal_delete" on gestao_comunicacao.membros_canal;
create policy "comunicacao_membros_canal_delete"
  on gestao_comunicacao.membros_canal
  for delete
  to authenticated
  using (colaborador_id = public.current_colaborador_id());

grant select, insert, update, delete on all tables in schema gestao_comunicacao to authenticated;
grant select, insert, update, delete on all tables in schema gestao_comunicacao to service_role;

alter table gestao_comunicacao.membros_canal replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_comunicacao'
      and tablename = 'membros_canal'
  ) then
    alter publication supabase_realtime add table gestao_comunicacao.membros_canal;
  end if;
end
$$;

notify pgrst, 'reload schema';
