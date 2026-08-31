-- Suprimento de caixa: nem sempre a solicitacao vai mencionar um colaborador especifico
-- (ex.: reforco de caixa geral do setor). O campo deixa de ser obrigatorio quando
-- tipo_beneficiario = 'colaborador' -- so continua proibido informar fornecedor_id junto.

alter table gestao_servicos.solicitacoes_pagamento
  drop constraint if exists chk_servicos_solicitacoes_beneficiario;

alter table gestao_servicos.solicitacoes_pagamento
  add constraint chk_servicos_solicitacoes_beneficiario check (
    (tipo_beneficiario = 'fornecedor' and fornecedor_id is not null and colaborador_beneficiario_id is null)
    or
    (tipo_beneficiario = 'colaborador' and fornecedor_id is null)
  );
