-- Flag de solicitacao de teste: admin pode marcar uma solicitacao (em qualquer fase da maquina
-- de estados) como dado de teste, o que libera a exclusao definitiva via a action
-- deletar_solicitacao mesmo fora do status 'reprovado' -- antes so dava pra excluir solicitacao
-- reprovada, o que nao cobria testes que ja avancaram pra aprovado/pago/cancelado.

alter table gestao_servicos.solicitacoes_pagamento
  add column if not exists eh_teste boolean not null default false;
