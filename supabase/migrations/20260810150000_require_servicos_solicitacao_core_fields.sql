-- Fornecedor, categoria e forma de pagamento ja sao obrigatorios em
-- validateCreatePayload (servicos-api), mas as colunas continuavam nullable no
-- banco. Dados atuais sao todos de teste, entao aproveita pra fazer backfill e
-- promover a regra pra constraint de verdade. titulo ja era "not null", so
-- faltava garantir que nao fique vazio.
update gestao_servicos.solicitacoes_pagamento
  set fornecedor_id = (select id from gestao_servicos.fornecedores order by criado_em limit 1)
  where fornecedor_id is null;

update gestao_servicos.solicitacoes_pagamento
  set categoria_id = (select id from gestao_servicos.categorias order by criado_em limit 1)
  where categoria_id is null;

update gestao_servicos.solicitacoes_pagamento
  set forma_pagamento = 'outros'
  where forma_pagamento is null;

update gestao_servicos.solicitacoes_pagamento
  set titulo = 'Sem titulo'
  where titulo = '';

alter table gestao_servicos.solicitacoes_pagamento
  alter column fornecedor_id set not null,
  alter column categoria_id set not null,
  alter column forma_pagamento set not null;

alter table gestao_servicos.solicitacoes_pagamento
  add constraint solicitacoes_pagamento_titulo_not_blank check (titulo <> '');
