alter table gestao_intranet.eventos_calendario
  add column if not exists recorrencia_cancelamentos date[] not null default '{}';
