-- Alinha a policy de delete de anexos_solicitacao com a regra de negocio da edge function:
-- financeiro/admin so podem remover anexo enquanto a solicitacao estiver pendente (ou com
-- pendencia_bloqueio), mesma janela que ja valia para o solicitante. Antes, a policy exigia
-- criado_por = current_colaborador_id() sem excecao para financeiro (nunca era de fato exercida,
-- pois a edge function conecta via DATABASE_URL direto e ignora RLS) - agora fica como defesa em
-- profundidade coerente com o que a function aplica.

drop policy if exists "servicos_anexos_delete" on gestao_servicos.anexos_solicitacao;
create policy "servicos_anexos_delete" on gestao_servicos.anexos_solicitacao
for delete to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = anexos_solicitacao.solicitacao_id
      and (sp.status = 'pendente' or sp.pendencia_bloqueio = true)
      and (
        public.servicos_is_financeiro()
        or sp.solicitante_id = public.current_colaborador_id()
      )
  )
);
