-- Novo papel no modulo Financeiro: contas_a_pagar. So visualiza (qualquer solicitacao, qualquer
-- status, igual ao financeiro) e paga (criar_parcelas/registrar_pagamento_parcela) -- nao aprova,
-- nao reprova, nao gerencia fornecedores/categorias/permissoes, e nao ve anexo sigiloso (esse
-- continua restrito a financeiro, solicitante e aprovador designado).

alter table gestao_servicos.permissoes_modulo
  drop constraint if exists permissoes_modulo_papel_check;

alter table gestao_servicos.permissoes_modulo
  add constraint permissoes_modulo_papel_check
  check (papel in ('nenhum', 'usuario', 'aprovador', 'financeiro', 'contas_a_pagar'));

-- financeiro ou contas_a_pagar: quem tem acesso "pleno" de leitura/pagamento a qualquer
-- solicitacao (mas nao necessariamente pode aprovar/reprovar nem ver anexo sigiloso).
create or replace function public.servicos_is_pagador(p_modulo text default 'financeiro')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.servicos_module_role(p_modulo) in ('financeiro', 'contas_a_pagar'), false);
$$;

-- Acesso a LINHA da solicitacao (nao confundir com acesso a anexo sigiloso, que continua mais
-- restrito -- ver policy servicos_anexos_select abaixo): agora inclui contas_a_pagar.
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
    public.servicos_is_pagador()
    or p_solicitante_id = public.current_colaborador_id()
    or (
      public.servicos_module_role() = 'aprovador'
      and p_aprovador_destino_id = public.current_colaborador_id()
    );
$$;

-- Anexo sigiloso: acesso a linha nao basta -- so financeiro, o proprio solicitante ou o
-- aprovador designado (contas_a_pagar fica de fora mesmo tendo acesso a solicitacao inteira).
drop policy if exists "servicos_anexos_select" on gestao_servicos.anexos_solicitacao;
create policy "servicos_anexos_select" on gestao_servicos.anexos_solicitacao
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = anexos_solicitacao.solicitacao_id
      and public.servicos_can_access_solicitacao(sp.solicitante_id, sp.aprovador_destino_id)
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
        )
    )
  )
);

-- Registrar pagamento de parcela e' a acao central de contas_a_pagar.
drop policy if exists "servicos_parcelas_write_financeiro" on gestao_servicos.parcelas_pagamento;
create policy "servicos_parcelas_write_financeiro" on gestao_servicos.parcelas_pagamento
for all to authenticated
using (public.servicos_is_pagador())
with check (public.servicos_is_pagador());
