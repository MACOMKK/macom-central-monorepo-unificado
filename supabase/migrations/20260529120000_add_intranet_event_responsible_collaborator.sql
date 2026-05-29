alter table gestao_intranet.eventos_calendario
  add column if not exists responsavel_colaborador_id uuid references public.colaboradores(id) on delete set null;

create index if not exists idx_intranet_eventos_calendario_responsavel_colaborador_id
  on gestao_intranet.eventos_calendario (responsavel_colaborador_id);

notify pgrst, 'reload schema';
