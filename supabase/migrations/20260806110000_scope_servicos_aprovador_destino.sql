-- Cada solicitacao do modulo Financeiro passa a ter um aprovador especifico
-- (coluna aprovador_destino_id, ja existente mas ainda nao usada em nenhuma regra).
-- Papel 'aprovador' so pode ver/aprovar a solicitacao endereçada a ele (ou as
-- proprias, como solicitante); papel 'financeiro' continua vendo/acessando tudo,
-- como ja acontecia. Sem essa trava, qualquer aprovador conseguia aprovar a
-- solicitacao de qualquer outro colaborador, mesmo sem ter sido o destinatario.

create or replace function public.servicos_can_access_solicitacao(
  p_solicitante_id uuid,
  p_aprovador_destino_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.servicos_is_financeiro()
    or p_solicitante_id = public.current_colaborador_id()
    or (
      public.servicos_module_role() = 'aprovador'
      and p_aprovador_destino_id = public.current_colaborador_id()
    );
$$;

drop policy if exists "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento;
create policy "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento
for select to authenticated
using (public.servicos_can_access_solicitacao(solicitante_id, aprovador_destino_id));

drop policy if exists "servicos_solicitacoes_update_aprovador" on gestao_servicos.solicitacoes_pagamento;
create policy "servicos_solicitacoes_update_aprovador" on gestao_servicos.solicitacoes_pagamento
for update to authenticated
using (
  public.servicos_is_financeiro()
  or (public.servicos_module_role() = 'aprovador' and aprovador_destino_id = public.current_colaborador_id())
)
with check (
  public.servicos_is_financeiro()
  or (public.servicos_module_role() = 'aprovador' and aprovador_destino_id = public.current_colaborador_id())
);

drop policy if exists "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento;
create policy "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = parcelas_pagamento.solicitacao_id
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id)
  )
);

drop policy if exists "servicos_anexos_select" on gestao_servicos.anexos_solicitacao;
create policy "servicos_anexos_select" on gestao_servicos.anexos_solicitacao
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = anexos_solicitacao.solicitacao_id
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id)
  )
);

drop policy if exists "servicos_anexos_insert" on gestao_servicos.anexos_solicitacao;
create policy "servicos_anexos_insert" on gestao_servicos.anexos_solicitacao
for insert to authenticated
with check (
  criado_por = public.current_colaborador_id()
  and exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = anexos_solicitacao.solicitacao_id
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id)
  )
);

drop policy if exists "servicos_historico_select" on gestao_servicos.historico_solicitacao;
create policy "servicos_historico_select" on gestao_servicos.historico_solicitacao
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = historico_solicitacao.solicitacao_id
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id)
  )
);

drop policy if exists "servicos_historico_insert" on gestao_servicos.historico_solicitacao;
create policy "servicos_historico_insert" on gestao_servicos.historico_solicitacao
for insert to authenticated
with check (
  autor_id = public.current_colaborador_id()
  and exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = historico_solicitacao.solicitacao_id
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id)
  )
);
