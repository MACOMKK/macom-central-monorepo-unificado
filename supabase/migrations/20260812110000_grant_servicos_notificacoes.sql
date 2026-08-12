-- gestao_servicos.notificacoes ficou sem GRANT pra authenticated na migration original
-- (20260812100000) -- diferente das demais tabelas do schema, que sempre concedem select/insert/
-- update pra authenticated + service_role. Sem esse grant, a RLS nunca chega a ser avaliada (a
-- permissao de tabela e checada antes) e o Realtime (que conecta com o JWT do proprio usuario,
-- nao com a service_role da edge function) nunca entrega o evento INSERT pro client -- so o
-- polling de 60s no NotificationsBell atualizava o sino, o toast em tempo real nunca disparava.
grant select, update on gestao_servicos.notificacoes to authenticated, service_role;
