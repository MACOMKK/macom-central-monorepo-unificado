alter table gestao_intranet.eventos_calendario replica identity full;
alter table gestao_intranet.eventos_calendario_participantes replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_intranet'
      and tablename = 'eventos_calendario'
  ) then
    alter publication supabase_realtime add table gestao_intranet.eventos_calendario;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_intranet'
      and tablename = 'eventos_calendario_participantes'
  ) then
    alter publication supabase_realtime add table gestao_intranet.eventos_calendario_participantes;
  end if;
end
$$;
