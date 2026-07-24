alter table gestao_pagamentos.solicitacoes_pagamento
  add column if not exists data_vencimento date,
  add column if not exists forma_pagamento text
    check (forma_pagamento in ('pix', 'boleto', 'transferencia', 'cartao', 'outros'));

create index if not exists idx_pagamentos_solicitacoes_vencimento
  on gestao_pagamentos.solicitacoes_pagamento (data_vencimento);
