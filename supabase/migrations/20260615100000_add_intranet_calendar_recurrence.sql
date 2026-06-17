alter table gestao_intranet.eventos_calendario
  add column if not exists recorrencia_tipo text not null default 'none',
  add column if not exists recorrencia_fim date,
  add column if not exists recorrencia_ativa boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'eventos_calendario_recorrencia_tipo_check'
  ) then
    alter table gestao_intranet.eventos_calendario
      add constraint eventos_calendario_recorrencia_tipo_check
      check (recorrencia_tipo in ('none', 'weekly', 'monthly'));
  end if;
end $$;
