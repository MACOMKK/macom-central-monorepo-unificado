alter table gestao_servicos.solicitacoes_pagamento
  add column if not exists sigiloso boolean not null default false;
