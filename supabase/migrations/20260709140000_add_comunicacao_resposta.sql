-- v2 do app "comunicacao": respostas em thread (reply-to) em mensagens (canais e DM).
-- Relacao 1:1 self-referencing: uma mensagem responde a, no maximo, uma outra mensagem
-- da mesma tabela. Nao ha tabela associativa pois nao ha cardinalidade N (diferente de anexos).

alter table gestao_comunicacao.mensagens
  add column if not exists resposta_a_id uuid
    references gestao_comunicacao.mensagens(id) on delete set null;

alter table gestao_comunicacao.mensagens_diretas
  add column if not exists resposta_a_id uuid
    references gestao_comunicacao.mensagens_diretas(id) on delete set null;

create index if not exists idx_comunicacao_mensagens_resposta_a_id
  on gestao_comunicacao.mensagens (resposta_a_id)
  where resposta_a_id is not null;

create index if not exists idx_comunicacao_mensagens_diretas_resposta_a_id
  on gestao_comunicacao.mensagens_diretas (resposta_a_id)
  where resposta_a_id is not null;

notify pgrst, 'reload schema';
