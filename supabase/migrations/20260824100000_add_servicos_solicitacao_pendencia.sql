-- Pendencia bloqueante de pagamento: quem cuida do contas a pagar (financeiro/contas_a_pagar)
-- pode sinalizar que uma solicitacao ja aprovada tem uma pendencia a resolver (nota fiscal
-- faltando, dado bancario incorreto, etc) sem reprova-la nem cancela-la -- ela continua
-- 'aprovado' na fila, so fica impedida de ser paga ate alguem do contas a pagar liberar.
-- E um flag ortogonal ao status (nao um novo valor da maquina de estados), por isso colunas
-- soltas em vez de mais um estado em solicitacoes_pagamento.status.

alter table gestao_servicos.solicitacoes_pagamento
  add column if not exists pendencia_bloqueio boolean not null default false,
  add column if not exists pendencia_motivo text,
  add column if not exists pendencia_aberta_por uuid references public.colaboradores(id),
  add column if not exists pendencia_aberta_em timestamptz;
