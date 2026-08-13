alter table gestao_servicos.solicitacoes_pagamento
  drop column if exists sigiloso;

alter table gestao_servicos.anexos_solicitacao
  add column if not exists sigiloso boolean not null default false;
