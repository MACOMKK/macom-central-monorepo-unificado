create table if not exists gestao_intranet.notificacoes (
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

create index if not exists idx_intranet_notificacoes_colaborador_criado
  on gestao_intranet.notificacoes (colaborador_id, criado_em desc);

create index if not exists idx_intranet_notificacoes_colaborador_lida
  on gestao_intranet.notificacoes (colaborador_id, lida_em);

alter table gestao_intranet.notificacoes enable row level security;

drop policy if exists "intranet_notificacoes_select_self"
  on gestao_intranet.notificacoes;
create policy "intranet_notificacoes_select_self"
  on gestao_intranet.notificacoes
  for select
  using (colaborador_id = auth.uid());

drop policy if exists "intranet_notificacoes_update_self"
  on gestao_intranet.notificacoes;
create policy "intranet_notificacoes_update_self"
  on gestao_intranet.notificacoes
  for update
  using (colaborador_id = auth.uid())
  with check (colaborador_id = auth.uid());
