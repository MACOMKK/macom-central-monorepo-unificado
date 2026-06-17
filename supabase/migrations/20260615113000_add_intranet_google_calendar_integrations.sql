create table if not exists gestao_intranet.integracoes_google_calendar (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  google_email text,
  refresh_token text not null,
  escopos text[] not null default '{}',
  conectado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (colaborador_id)
);

create table if not exists gestao_intranet.integracoes_google_oauth_state (
  state text primary key,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  redirect_to text,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '10 minutes')
);

create index if not exists idx_intranet_google_calendar_integracoes_colaborador
  on gestao_intranet.integracoes_google_calendar (colaborador_id);

create index if not exists idx_intranet_google_oauth_state_expira
  on gestao_intranet.integracoes_google_oauth_state (expira_em);

alter table gestao_intranet.integracoes_google_calendar enable row level security;
alter table gestao_intranet.integracoes_google_oauth_state enable row level security;

drop policy if exists "intranet_google_calendar_select_self"
  on gestao_intranet.integracoes_google_calendar;
create policy "intranet_google_calendar_select_self"
  on gestao_intranet.integracoes_google_calendar
  for select
  using (colaborador_id = auth.uid());

drop policy if exists "intranet_google_calendar_manage_self"
  on gestao_intranet.integracoes_google_calendar;
create policy "intranet_google_calendar_manage_self"
  on gestao_intranet.integracoes_google_calendar
  for all
  using (colaborador_id = auth.uid())
  with check (colaborador_id = auth.uid());

drop policy if exists "intranet_google_oauth_state_manage_self"
  on gestao_intranet.integracoes_google_oauth_state;
create policy "intranet_google_oauth_state_manage_self"
  on gestao_intranet.integracoes_google_oauth_state
  for all
  using (colaborador_id = auth.uid())
  with check (colaborador_id = auth.uid());
