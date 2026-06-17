alter table gestao_intranet.eventos_calendario
  add column if not exists google_meet_url text,
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_organizer_id uuid references public.colaboradores(id) on delete set null;
