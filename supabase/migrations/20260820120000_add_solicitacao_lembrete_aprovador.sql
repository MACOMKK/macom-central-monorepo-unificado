alter table gestao_servicos.solicitacoes_pagamento
  add column if not exists lembrete_aprovador_em timestamptz;
