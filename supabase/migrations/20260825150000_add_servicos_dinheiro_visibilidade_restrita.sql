-- Solicitacao com forma_pagamento = 'dinheiro' fica visivel so pro solicitante, pro aprovador
-- destino (fluxo de aprovacao normal) e pro papel financeiro (quem paga) -- contas_a_pagar NAO
-- ve nem age sobre ela, mesmo tendo acesso amplo as demais formas de pagamento. Tambem ignora a
-- regra de "mesmo setor" (20260817100000_add_servicos_setor_visibility.sql): dinheiro nao amplia
-- visibilidade por departamento. Restricao e configuravel via
-- gestao_servicos.configuracoes_modulo.restringir_visibilidade_pagamento_dinheiro (default true,
-- fail-safe true se a linha nao existir) -- pedido explicito do usuario, sem mecanismo de
-- configuracao generico no sistema hoje, entao criada so a tabela minima necessaria pra isso.

-- O CHECK do banco estava desatualizado em relacao ao array FORMAS_PAGAMENTO da edge function e
-- ao FORMA_PAGAMENTO_LABEL do frontend, que ja validavam/exibiam 'dinheiro', 'cheque',
-- 'arquivo_bancario' e 'deposito_bancario' sem o banco aceitar -- corrige pra bater com as duas
-- listas (nao so adiciona 'dinheiro').
alter table gestao_servicos.solicitacoes_pagamento
  drop constraint if exists solicitacoes_pagamento_forma_pagamento_check;

alter table gestao_servicos.solicitacoes_pagamento
  add constraint solicitacoes_pagamento_forma_pagamento_check
  check (forma_pagamento in (
    'pix', 'boleto', 'transferencia', 'cartao', 'dinheiro', 'cheque',
    'arquivo_bancario', 'deposito_bancario', 'outros'
  ));

create table if not exists gestao_servicos.configuracoes_modulo (
  id uuid primary key default gen_random_uuid(),
  modulo text not null default 'financeiro',
  restringir_visibilidade_pagamento_dinheiro boolean not null default true,
  atualizado_por uuid references public.colaboradores(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint configuracoes_modulo_modulo_unico unique (modulo)
);

alter table gestao_servicos.configuracoes_modulo enable row level security;

-- Leitura liberada a qualquer autenticado do sistema (a checagem de RLS/edge function que
-- realmente importa e' a que usa esse flag, nao a leitura da config em si). Sem policy de
-- insert/update/delete para authenticated -- alteracao so via action da edge function, restrita
-- a isFinanceiro() (roda com DATABASE_URL direto, bypassa RLS).
create policy "servicos_configuracoes_modulo_select" on gestao_servicos.configuracoes_modulo
for select to authenticated
using (true);

insert into gestao_servicos.configuracoes_modulo (modulo, restringir_visibilidade_pagamento_dinheiro)
values ('financeiro', true)
on conflict (modulo) do nothing;

-- Fail-safe: se a linha de config nao existir por algum motivo, assume restritivo (mais seguro).
create or replace function public.servicos_restringe_visibilidade_dinheiro(p_modulo text default 'financeiro')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select cm.restringir_visibilidade_pagamento_dinheiro
     from gestao_servicos.configuracoes_modulo cm
     where cm.modulo = p_modulo),
    true
  );
$$;

-- Substitui a assinatura de 3 parametros por uma de 4 (adiciona p_forma_pagamento); mesmo padrao
-- de 20260817100000: precisa dropar as policies dependentes antes de dropar a funcao.
drop policy if exists "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento;
drop policy if exists "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento;
drop policy if exists "servicos_anexos_select" on gestao_servicos.anexos_solicitacao;
drop policy if exists "servicos_anexos_insert" on gestao_servicos.anexos_solicitacao;
drop policy if exists "servicos_historico_select" on gestao_servicos.historico_solicitacao;
drop policy if exists "servicos_historico_insert" on gestao_servicos.historico_solicitacao;

drop function if exists public.servicos_can_access_solicitacao(uuid, uuid, uuid);

create function public.servicos_can_access_solicitacao(
  p_solicitante_id uuid,
  p_aprovador_destino_id uuid,
  p_departamento_id uuid,
  p_forma_pagamento text default null
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
        )
    end;
$$;

drop policy if exists "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento;
create policy "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento
for select to authenticated
using (public.servicos_can_access_solicitacao(solicitante_id, aprovador_destino_id, departamento_id, forma_pagamento));

drop policy if exists "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento;
create policy "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = parcelas_pagamento.solicitacao_id
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id, sp.forma_pagamento)
  )
);

-- Anexo sigiloso tem checagem inline propria (mais restrita que acesso a linha): segue o mesmo
-- caso "dinheiro" -- so solicitante/financeiro/aprovador destino, sem ampliar por setor.
drop policy if exists "servicos_anexos_select" on gestao_servicos.anexos_solicitacao;
create policy "servicos_anexos_select" on gestao_servicos.anexos_solicitacao
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = anexos_solicitacao.solicitacao_id
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id, sp.forma_pagamento)
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
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id, sp.forma_pagamento)
  )
);

drop policy if exists "servicos_historico_select" on gestao_servicos.historico_solicitacao;
create policy "servicos_historico_select" on gestao_servicos.historico_solicitacao
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = historico_solicitacao.solicitacao_id
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id, sp.forma_pagamento)
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
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id, sp.departamento_id, sp.forma_pagamento)
  )
);

-- servicos_parcelas_write_financeiro (insert/update/delete de parcelas, financeiro/contas_a_pagar)
-- nao passa por servicos_can_access_solicitacao -- precisa da mesma restricao em dinheiro, senao
-- contas_a_pagar continuaria conseguindo escrever (via RLS direto) numa solicitacao que nao ve.
drop policy if exists "servicos_parcelas_write_financeiro" on gestao_servicos.parcelas_pagamento;
create policy "servicos_parcelas_write_financeiro" on gestao_servicos.parcelas_pagamento
for all to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = parcelas_pagamento.solicitacao_id
      and (
        case
          when sp.forma_pagamento = 'dinheiro' and public.servicos_restringe_visibilidade_dinheiro() then
            public.servicos_is_financeiro()
          else
            public.servicos_is_pagador()
        end
      )
  )
)
with check (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = parcelas_pagamento.solicitacao_id
      and (
        case
          when sp.forma_pagamento = 'dinheiro' and public.servicos_restringe_visibilidade_dinheiro() then
            public.servicos_is_financeiro()
          else
            public.servicos_is_pagador()
        end
      )
  )
);
