alter table gestao_intranet.avisos replica identity full;
alter table gestao_intranet.comentarios_avisos replica identity full;
alter table gestao_intranet.reacoes_avisos replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_intranet'
      and tablename = 'avisos'
  ) then
    alter publication supabase_realtime add table gestao_intranet.avisos;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_intranet'
      and tablename = 'comentarios_avisos'
  ) then
    alter publication supabase_realtime add table gestao_intranet.comentarios_avisos;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_intranet'
      and tablename = 'reacoes_avisos'
  ) then
    alter publication supabase_realtime add table gestao_intranet.reacoes_avisos;
  end if;
end
$$;
