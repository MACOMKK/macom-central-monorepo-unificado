-- Reprovar uma solicitacao JA APROVADA (fluxo de /pagamentos) e restrito ao financeiro hoje.
-- Flag configuravel pra permitir que contas_a_pagar tambem reprove nesse caso especifico --
-- reprovar uma solicitacao ainda PENDENTE continua exclusivo de financeiro/aprovador designado,
-- sem relacao com esta flag (ver set_status em servicos-api/index.ts). Mesma linha/tabela dos
-- demais flags do modulo, default true (mais restritivo, preserva o comportamento atual).
alter table gestao_servicos.configuracoes_modulo
  add column if not exists restringir_reprovacao_contas_a_pagar boolean not null default true;
