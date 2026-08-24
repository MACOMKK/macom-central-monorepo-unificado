-- Sinal de "solicitante corrigiu durante a pendencia": quando o dono edita a solicitacao
-- enquanto pendencia_bloqueio esta ativo, marcamos pendencia_atualizada_em para o contas a
-- pagar saber que ha novidade a revisar, sem precisar ficar reconferindo manualmente.
-- Limpo (null) toda vez que uma pendencia e aberta ou liberada, pra nao vazar entre ciclos.

alter table gestao_servicos.solicitacoes_pagamento
  add column if not exists pendencia_atualizada_em timestamptz;
