create table if not exists gestao_intranet.eventos_calendario_participantes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references gestao_intranet.eventos_calendario(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  status text not null default 'convidado'
    check (status in ('convidado', 'confirmado', 'recusado', 'talvez')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (evento_id, colaborador_id)
);

create index if not exists idx_intranet_eventos_calendario_participantes_evento
  on gestao_intranet.eventos_calendario_participantes (evento_id);

create index if not exists idx_intranet_eventos_calendario_participantes_colaborador
  on gestao_intranet.eventos_calendario_participantes (colaborador_id);

alter table gestao_intranet.eventos_calendario_participantes enable row level security;

drop policy if exists "intranet_eventos_calendario_participantes_select"
  on gestao_intranet.eventos_calendario_participantes;
create policy "intranet_eventos_calendario_participantes_select"
  on gestao_intranet.eventos_calendario_participantes
  for select
  using (public.intranet_can_view_module('calendario'));

drop policy if exists "intranet_eventos_calendario_participantes_manage"
  on gestao_intranet.eventos_calendario_participantes;
create policy "intranet_eventos_calendario_participantes_manage"
  on gestao_intranet.eventos_calendario_participantes
  for all
  using (public.intranet_can_edit_module('calendario'))
  with check (public.intranet_can_edit_module('calendario'));
