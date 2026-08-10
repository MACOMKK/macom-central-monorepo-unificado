-- A action 'cancelar_solicitacao' da servicos-api sempre gravou status = 'cancelado'
-- (ver insertHistorico 'cancelada' e STATUS_LABEL/STATUS_VARIANT no front, que ja tratam esse
-- status), mas o check constraint original da tabela (20260716090000_add_gestao_pagamentos_core.sql)
-- nunca incluiu 'cancelado' na lista permitida — cancelar uma solicitacao sempre falhou com
-- "violates check constraint solicitacoes_pagamento_status_check".
alter table gestao_servicos.solicitacoes_pagamento
  drop constraint if exists solicitacoes_pagamento_status_check;

alter table gestao_servicos.solicitacoes_pagamento
  add constraint solicitacoes_pagamento_status_check
  check (status in ('pendente', 'aprovado', 'reprovado', 'pago', 'cancelado'));
