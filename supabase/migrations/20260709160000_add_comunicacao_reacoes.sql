-- v2 do app "comunicacao": reacoes (emoji) em mensagens (canais e DM).

create table if not exists gestao_comunicacao.reacoes_mensagem (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid references gestao_comunicacao.mensagens(id) on delete cascade,
  mensagem_direta_id uuid references gestao_comunicacao.mensagens_diretas(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id),
  emoji text not null check (char_length(emoji) between 1 and 8),
  criado_em timestamptz not null default now(),
  check (
    (case when mensagem_id is not null then 1 else 0 end)
    + (case when mensagem_direta_id is not null then 1 else 0 end) = 1
  )
);

create unique index if not exists idx_comunicacao_reacoes_mensagem_unica
  on gestao_comunicacao.reacoes_mensagem (mensagem_id, colaborador_id, emoji)
  where mensagem_id is not null;

create unique index if not exists idx_comunicacao_reacoes_mensagem_direta_unica
  on gestao_comunicacao.reacoes_mensagem (mensagem_direta_id, colaborador_id, emoji)
  where mensagem_direta_id is not null;

alter table gestao_comunicacao.reacoes_mensagem enable row level security;

drop policy if exists "comunicacao_reacoes_select" on gestao_comunicacao.reacoes_mensagem;
create policy "comunicacao_reacoes_select"
  on gestao_comunicacao.reacoes_mensagem
  for select
  to authenticated
  using (
    exists (
      select 1 from gestao_comunicacao.mensagens m
      where m.id = reacoes_mensagem.mensagem_id
        and public.comunicacao_can_access_canal(m.canal_id)
    )
    or exists (
      select 1 from gestao_comunicacao.mensagens_diretas md
      where md.id = reacoes_mensagem.mensagem_direta_id
        and public.comunicacao_can_access_conversa(md.conversa_id)
    )
  );

drop policy if exists "comunicacao_reacoes_insert" on gestao_comunicacao.reacoes_mensagem;
create policy "comunicacao_reacoes_insert"
  on gestao_comunicacao.reacoes_mensagem
  for insert
  to authenticated
  with check (
    colaborador_id = public.current_colaborador_id()
    and (
      exists (
        select 1 from gestao_comunicacao.mensagens m
        where m.id = reacoes_mensagem.mensagem_id
          and public.comunicacao_can_access_canal(m.canal_id)
      )
      or exists (
        select 1 from gestao_comunicacao.mensagens_diretas md
        where md.id = reacoes_mensagem.mensagem_direta_id
          and public.comunicacao_can_access_conversa(md.conversa_id)
      )
    )
  );

drop policy if exists "comunicacao_reacoes_delete" on gestao_comunicacao.reacoes_mensagem;
create policy "comunicacao_reacoes_delete"
  on gestao_comunicacao.reacoes_mensagem
  for delete
  to authenticated
  using (colaborador_id = public.current_colaborador_id());

grant select, insert, delete on gestao_comunicacao.reacoes_mensagem to authenticated;
grant select, insert, delete on gestao_comunicacao.reacoes_mensagem to service_role;

alter table gestao_comunicacao.reacoes_mensagem replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_comunicacao'
      and tablename = 'reacoes_mensagem'
  ) then
    alter publication supabase_realtime add table gestao_comunicacao.reacoes_mensagem;
  end if;
end
$$;

notify pgrst, 'reload schema';
