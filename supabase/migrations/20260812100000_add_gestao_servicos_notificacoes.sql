-- Notificacoes in-app do modulo Financeiro (apps/servicos), mesmo padrao ja usado em
-- gestao_intranet.notificacoes: uma linha por notificacao/colaborador, lida_em nulo = nao lida,
-- Realtime habilitado pra empurrar pro sino da sidebar sem polling.
create table if not exists gestao_servicos.notificacoes (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  tipo text not null default 'geral',
  titulo text not null,
  mensagem text,
  link text,
  referencia_tipo text,
  referencia_id uuid,
  lida_em timestamptz,
  criado_por uuid references public.colaboradores(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_servicos_notificacoes_colaborador_criado
  on gestao_servicos.notificacoes (colaborador_id, criado_em desc);

create index if not exists idx_servicos_notificacoes_colaborador_lida
  on gestao_servicos.notificacoes (colaborador_id, lida_em);

alter table gestao_servicos.notificacoes enable row level security;

-- Ao contrario de gestao_intranet.notificacoes (que compara direto com auth.uid()),
-- colaboradores.id não é o mesmo uuid do usuario auth -- o mapeamento correto e via
-- public.current_colaborador_id() (join por email), ja usado em todas as policies de
-- gestao_servicos.
drop policy if exists "servicos_notificacoes_select_self" on gestao_servicos.notificacoes;
create policy "servicos_notificacoes_select_self"
  on gestao_servicos.notificacoes
  for select
  using (colaborador_id = public.current_colaborador_id());

drop policy if exists "servicos_notificacoes_update_self" on gestao_servicos.notificacoes;
create policy "servicos_notificacoes_update_self"
  on gestao_servicos.notificacoes
  for update
  using (colaborador_id = public.current_colaborador_id())
  with check (colaborador_id = public.current_colaborador_id());

alter table gestao_servicos.notificacoes replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_servicos'
      and tablename = 'notificacoes'
  ) then
    alter publication supabase_realtime add table gestao_servicos.notificacoes;
  end if;
end
$$;
