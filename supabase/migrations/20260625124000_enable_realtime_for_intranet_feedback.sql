alter table gestao_intranet.feedback replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_intranet'
      and tablename = 'feedback'
  ) then
    alter publication supabase_realtime add table gestao_intranet.feedback;
  end if;
end
$$;
