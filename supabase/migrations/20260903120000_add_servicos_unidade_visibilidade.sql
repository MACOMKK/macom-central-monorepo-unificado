-- Visibilidade por setor (20260817100000_add_servicos_setor_visibility.sql) e mesma unidade
-- (unidade_id) passam a ser exigidas juntas: a ampliacao "colega do mesmo departamento" so vale
-- se a unidade tambem bater, quando os dois lados (unidade do colaborador logado e unidade
-- snapshot da linha/aprovador) sao conhecidos. Se qualquer lado for null, a regra de departamento
-- continua valendo sozinha (fallback: nao nega acesso so porque a unidade nao pode ser
-- comparada). Mesmo padrao das migrations anteriores (20260817100000, 20260825150000_add_servicos
-- _dinheiro_visibilidade_restrita.sql): precisa dropar as policies dependentes antes de dropar/
-- recriar a funcao com assinatura diferente.

create or replace function public.servicos_current_unit_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.unidade_id
  from public.colaboradores c
  where c.id = public.current_colaborador_id()
  limit 1;
$$;

drop policy if exists "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento;
drop policy if exists "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento;
drop policy if exists "servicos_anexos_select" on gestao_servicos.anexos_solicitacao;
drop policy if exists "servicos_anexos_insert" on gestao_servicos.anexos_solicitacao;
drop policy if exists "servicos_historico_select" on gestao_servicos.historico_solicitacao;
drop policy if exists "servicos_historico_insert" on gestao_servicos.historico_solicitacao;

-- Substitui a assinatura de 4 parametros (20260825150000) por uma de 5 (adiciona p_unidade_id).
drop function if exists public.servicos_can_access_solicitacao(uuid, uuid, uuid, text);

create function public.servicos_can_access_solicitacao(
  p_solicitante_id uuid,
  p_aprovador_destino_id uuid,
  p_departamento_id uuid,
  p_forma_pagamento text default null,
  p_unidade_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when p_forma_pagamento = 'dinheiro' and public.servicos_restringe_visibilidade_dinheiro() then
        p_solicitante_id = public.current_colaborador_id()
        or public.servicos_is_financeiro()
        or (
          public.servicos_module_role() = 'aprovador'
          and p_aprovador_destino_id = public.current_colaborador_id()
        )
      else
        public.servicos_is_pagador()
        or p_solicitante_id = public.current_colaborador_id()
        or (
          public.servicos_module_role() = 'aprovador'
          and p_aprovador_destino_id = public.current_colaborador_id()
        )
        or (
          p_departamento_id is not null
          and p_departamento_id = public.servicos_current_department_id()
          and (
            p_unidade_id is null
            or public.servicos_current_unit_id() is null
            or p_unidade_id = public.servicos_current_unit_id()
          )
        )
    end;
$$;

drop policy if exists "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento;
create policy "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento
for select to authenticated
using (
  public.servicos_can_access_solicitacao(
    solicitante_id, aprovador_destino_id, departamento_id, forma_pagamento, unidade_id
  )
);

drop policy if exists "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento;
create policy "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = parcelas_pagamento.solicitacao_id
      and public.servicos_can_access_solicitacao(
        sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id, sp.forma_pagamento, sp.unidade_id
      )
  )
);

-- Anexo sigiloso segue a mesma regra inline (mais restrita que acesso a linha): dinheiro
-- continua sem ampliar por setor/unidade; fora disso, mesmo departamento E (unidade desconhecida
-- em algum lado OU mesma unidade).
drop policy if exists "servicos_anexos_select" on gestao_servicos.anexos_solicitacao;
create policy "servicos_anexos_select" on gestao_servicos.anexos_solicitacao
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = anexos_solicitacao.solicitacao_id
      and public.servicos_can_access_solicitacao(
        sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id, sp.forma_pagamento, sp.unidade_id
      )
  )
  and (
    not anexos_solicitacao.sigiloso
    or exists (
      select 1 from gestao_servicos.solicitacoes_pagamento sp
      where sp.id = anexos_solicitacao.solicitacao_id
        and (
          case
            when sp.forma_pagamento = 'dinheiro' and public.servicos_restringe_visibilidade_dinheiro() then
              public.servicos_is_financeiro()
              or sp.solicitante_id = public.current_colaborador_id()
              or (
                public.servicos_module_role() = 'aprovador'
                and sp.aprovador_destino_id = public.current_colaborador_id()
              )
            else
              public.servicos_is_financeiro()
              or sp.solicitante_id = public.current_colaborador_id()
              or (
                public.servicos_module_role() = 'aprovador'
                and sp.aprovador_destino_id = public.current_colaborador_id()
              )
              or (
                sp.departamento_id is not null
                and sp.departamento_id = public.servicos_current_department_id()
                and (
                  sp.unidade_id is null
                  or public.servicos_current_unit_id() is null
                  or sp.unidade_id = public.servicos_current_unit_id()
                )
              )
          end
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
      and public.servicos_can_access_solicitacao(
        sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id, sp.forma_pagamento, sp.unidade_id
      )
  )
);

drop policy if exists "servicos_historico_select" on gestao_servicos.historico_solicitacao;
create policy "servicos_historico_select" on gestao_servicos.historico_solicitacao
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = historico_solicitacao.solicitacao_id
      and public.servicos_can_access_solicitacao(
        sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id, sp.forma_pagamento, sp.unidade_id
      )
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
      and public.servicos_can_access_solicitacao(
        sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id, sp.forma_pagamento, sp.unidade_id
      )
  )
);

-- servicos_parcelas_write_financeiro nao usa servicos_can_access_solicitacao (so
-- servicos_is_financeiro/servicos_is_pagador puros para dinheiro/demais) -- nao depende de
-- departamento/unidade, entao nao precisa ser recriada aqui.
