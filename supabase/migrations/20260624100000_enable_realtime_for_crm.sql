alter table gestao_crm.clientes replica identity full;
alter table gestao_crm.leads replica identity full;
alter table gestao_crm.atendimentos replica identity full;
alter table gestao_crm.historico_atendimentos replica identity full;
alter table gestao_crm.configuracoes_distribuicao replica identity full;
alter table gestao_crm.vendedores_distribuicao replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_crm'
      and tablename = 'clientes'
  ) then
    alter publication supabase_realtime add table gestao_crm.clientes;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_crm'
      and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table gestao_crm.leads;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_crm'
      and tablename = 'atendimentos'
  ) then
    alter publication supabase_realtime add table gestao_crm.atendimentos;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_crm'
      and tablename = 'historico_atendimentos'
  ) then
    alter publication supabase_realtime add table gestao_crm.historico_atendimentos;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_crm'
      and tablename = 'configuracoes_distribuicao'
  ) then
    alter publication supabase_realtime add table gestao_crm.configuracoes_distribuicao;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_crm'
      and tablename = 'vendedores_distribuicao'
  ) then
    alter publication supabase_realtime add table gestao_crm.vendedores_distribuicao;
  end if;
end
$$;
