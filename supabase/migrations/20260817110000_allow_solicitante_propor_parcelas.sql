-- Solicitante pode propor um plano de pagamento ja na criacao da solicitacao (enquanto ela
-- ainda esta 'pendente', antes de aprovada). Depois de aprovada, so financeiro/contas_a_pagar
-- pode inserir/revisar parcelas (policy servicos_parcelas_write_financeiro, que continua
-- cobrindo update/delete e insert fora do caso "pendente" abaixo).
-- A edge function conecta direto via DATABASE_URL (bypassa RLS) — esta policy e so defesa em
-- profundidade, pra manter a RLS consistente com a regra de negocio aplicada em index.ts.

create policy "servicos_parcelas_insert_solicitante" on gestao_servicos.parcelas_pagamento
for insert to authenticated
with check (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = parcelas_pagamento.solicitacao_id
      and sp.solicitante_id = public.current_colaborador_id()
      and sp.status = 'pendente'
  )
);
