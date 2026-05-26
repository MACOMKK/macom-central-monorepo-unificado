grant usage on schema gestao_relatorio to authenticated;
grant usage on schema gestao_relatorio to service_role;
grant select, insert, update, delete on all tables in schema gestao_relatorio to authenticated;
grant select, insert, update, delete on all tables in schema gestao_relatorio to service_role;
alter default privileges in schema gestao_relatorio
grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema gestao_relatorio
grant select, insert, update, delete on tables to service_role;
