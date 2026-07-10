-- item 12 do backlog v2: mencoes (@usuario) em mensagens de canal e DM.
-- Guardamos so os ids mencionados (uuid[]) na propria linha da mensagem; o
-- destaque visual do "@Nome" no texto e resolvido no client via um marcador
-- "@[Nome]" inserido pelo autocomplete do composer, sem precisar de tabela
-- ou coluna extra so pra isso. O contador de "mencoes nao lidas" reaproveita
-- o mesmo ponteiro de leitura (leituras_mensagem.ultima_leitura_em) que ja
-- existe para o contador geral de nao lidas — mencao nao lida = mensagem
-- mais nova que o ponteiro E que contem o colaborador em `mencoes`.

alter table gestao_comunicacao.mensagens
  add column if not exists mencoes uuid[] not null default '{}';

alter table gestao_comunicacao.mensagens_diretas
  add column if not exists mencoes uuid[] not null default '{}';

create index if not exists idx_comunicacao_mensagens_mencoes
  on gestao_comunicacao.mensagens using gin (mencoes);

create index if not exists idx_comunicacao_mensagens_diretas_mencoes
  on gestao_comunicacao.mensagens_diretas using gin (mencoes);

notify pgrst, 'reload schema';
