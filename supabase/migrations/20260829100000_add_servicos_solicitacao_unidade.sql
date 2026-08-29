alter table gestao_servicos.solicitacoes_pagamento
  add column if not exists unidade_id uuid references public.unidades(id) on delete set null;

create index if not exists idx_servicos_solicitacoes_unidade_id
  on gestao_servicos.solicitacoes_pagamento (unidade_id);
