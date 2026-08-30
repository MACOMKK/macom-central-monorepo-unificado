-- Suprimento de caixa: solicitacao pode ser endereçada a um colaborador em vez de um
-- fornecedor. Beneficiario vira polimorfico (tipo_beneficiario + FK correspondente),
-- mesmo padrao de snapshot que fornecedor_id/fornecedor ja usava.

alter table gestao_servicos.solicitacoes_pagamento
  add column if not exists tipo_beneficiario text not null default 'fornecedor'
    check (tipo_beneficiario in ('fornecedor', 'colaborador')),
  add column if not exists colaborador_beneficiario_id uuid references public.colaboradores(id) on delete set null,
  alter column fornecedor_id drop not null;

alter table gestao_servicos.solicitacoes_pagamento
  drop constraint if exists chk_servicos_solicitacoes_beneficiario;

alter table gestao_servicos.solicitacoes_pagamento
  add constraint chk_servicos_solicitacoes_beneficiario check (
    (tipo_beneficiario = 'fornecedor' and fornecedor_id is not null and colaborador_beneficiario_id is null)
    or
    (tipo_beneficiario = 'colaborador' and colaborador_beneficiario_id is not null and fornecedor_id is null)
  );

create index if not exists idx_servicos_solicitacoes_colaborador_beneficiario_id
  on gestao_servicos.solicitacoes_pagamento (colaborador_beneficiario_id);
