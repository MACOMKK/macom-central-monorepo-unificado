-- v2 do app "comunicacao": contador de nao lidas via ponteiro de ultima leitura
-- (nao e log por mensagem — uma linha por colaborador+sala guardando ate quando
-- ele leu; contagem de nao lidas = mensagens mais novas que esse ponteiro).

create table if not exists gestao_comunicacao.leituras_mensagem (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  canal_id uuid references gestao_comunicacao.canais(id) on delete cascade,
  conversa_id uuid references gestao_comunicacao.conversas_diretas(id) on delete cascade,
  ultima_leitura_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (
    (case when canal_id is not null then 1 else 0 end)
    + (case when conversa_id is not null then 1 else 0 end) = 1
  )
);

create unique index if not exists idx_comunicacao_leituras_canal_unica
  on gestao_comunicacao.leituras_mensagem (colaborador_id, canal_id)
  where canal_id is not null;

create unique index if not exists idx_comunicacao_leituras_conversa_unica
  on gestao_comunicacao.leituras_mensagem (colaborador_id, conversa_id)
  where conversa_id is not null;

alter table gestao_comunicacao.leituras_mensagem enable row level security;

drop policy if exists "comunicacao_leituras_select" on gestao_comunicacao.leituras_mensagem;
create policy "comunicacao_leituras_select"
  on gestao_comunicacao.leituras_mensagem
  for select
  to authenticated
  using (colaborador_id = public.current_colaborador_id());

drop policy if exists "comunicacao_leituras_insert" on gestao_comunicacao.leituras_mensagem;
create policy "comunicacao_leituras_insert"
  on gestao_comunicacao.leituras_mensagem
  for insert
  to authenticated
  with check (
    colaborador_id = public.current_colaborador_id()
    and (
      (canal_id is not null and public.comunicacao_can_access_canal(canal_id))
      or (conversa_id is not null and public.comunicacao_can_access_conversa(conversa_id))
    )
  );

drop policy if exists "comunicacao_leituras_update" on gestao_comunicacao.leituras_mensagem;
create policy "comunicacao_leituras_update"
  on gestao_comunicacao.leituras_mensagem
  for update
  to authenticated
  using (colaborador_id = public.current_colaborador_id())
  with check (colaborador_id = public.current_colaborador_id());

grant select, insert, update on gestao_comunicacao.leituras_mensagem to authenticated;
grant select, insert, update on gestao_comunicacao.leituras_mensagem to service_role;

alter table gestao_comunicacao.leituras_mensagem replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_comunicacao'
      and tablename = 'leituras_mensagem'
  ) then
    alter publication supabase_realtime add table gestao_comunicacao.leituras_mensagem;
  end if;
end
$$;

notify pgrst, 'reload schema';
