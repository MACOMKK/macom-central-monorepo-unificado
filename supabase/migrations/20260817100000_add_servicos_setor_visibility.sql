-- Visibilidade por setor em Solicitacoes: qualquer papel (usuario/aprovador) passa a ver tambem
-- as solicitacoes de colegas do mesmo departamento_id atual, alem das proprias/endereçadas a ele.
-- Nao muda quem aprova/reprova (aprovador_destino_id) nem quem paga (financeiro/contas_a_pagar).
-- Anexo sigiloso: colegas do mesmo setor tambem passam a ver (pedido explicito do usuario --
-- quem abriu a solicitacao e quem e do mesmo setor podem ver os anexos sigilosos dela); segue
-- restrito pra quem NAO e do mesmo setor e nao e financeiro/solicitante/aprovador designado --
-- contas_a_pagar continua de fora mesmo tendo acesso a linha, a nao ser que seja do mesmo setor.

create or replace function public.servicos_current_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.departamento_id
  from public.colaboradores c
  where c.id = public.current_colaborador_id()
  limit 1;
$$;

-- Substitui a assinatura de 2 parametros por uma de 3 (adiciona p_departamento_id); precisa
-- dropar a antiga explicitamente porque Postgres identifica funcoes por nome+tipos dos
-- parametros, entao "create or replace" com assinatura diferente cria uma sobrecarga em vez de
-- substituir, deixando a funcao antiga (sem checagem de setor) organicamente para tras. Isso so
-- e possivel depois de derrubar as policies que ainda referenciam a assinatura antiga (2
-- parametros) -- Postgres nao deixa dropar uma funcao com objetos dependentes.
drop policy if exists "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento;
drop policy if exists "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento;
drop policy if exists "servicos_anexos_select" on gestao_servicos.anexos_solicitacao;
drop policy if exists "servicos_anexos_insert" on gestao_servicos.anexos_solicitacao;
drop policy if exists "servicos_historico_select" on gestao_servicos.historico_solicitacao;
drop policy if exists "servicos_historico_insert" on gestao_servicos.historico_solicitacao;

drop function if exists public.servicos_can_access_solicitacao(uuid, uuid);

create function public.servicos_can_access_solicitacao(
  p_solicitante_id uuid,
  p_aprovador_destino_id uuid,
  p_departamento_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.servicos_is_pagador()
    or p_solicitante_id = public.current_colaborador_id()
    or (
      public.servicos_module_role() = 'aprovador'
      and p_aprovador_destino_id = public.current_colaborador_id()
    )
    or (
      p_departamento_id is not null
      and p_departamento_id = public.servicos_current_department_id()
    );
$$;

drop policy if exists "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento;
create policy "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento
for select to authenticated
using (public.servicos_can_access_solicitacao(solicitante_id, aprovador_destino_id, departamento_id));

drop policy if exists "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento;
create policy "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = parcelas_pagamento.solicitacao_id
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id)
  )
);

drop policy if exists "servicos_anexos_select" on gestao_servicos.anexos_solicitacao;
create policy "servicos_anexos_select" on gestao_servicos.anexos_solicitacao
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = anexos_solicitacao.solicitacao_id
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id)
  )
  and (
    not anexos_solicitacao.sigiloso
    or exists (
      select 1 from gestao_servicos.solicitacoes_pagamento sp
      where sp.id = anexos_solicitacao.solicitacao_id
        and (
          public.servicos_is_financeiro()
          or sp.solicitante_id = public.current_colaborador_id()
          or (
            public.servicos_module_role() = 'aprovador'
            and sp.aprovador_destino_id = public.current_colaborador_id()
          )
          or (
            sp.departamento_id is not null
            and sp.departamento_id = public.servicos_current_department_id()
          )
        )
    )
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
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id)
  )
);

drop policy if exists "servicos_historico_select" on gestao_servicos.historico_solicitacao;
create policy "servicos_historico_select" on gestao_servicos.historico_solicitacao
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = historico_solicitacao.solicitacao_id
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id)
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
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id)
  )
);
