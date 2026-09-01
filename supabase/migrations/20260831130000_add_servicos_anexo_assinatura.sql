-- Assinatura de anexos (apps/servicos, modulo Financeiro): permite assinar um anexo PDF
-- substituindo o arquivo pela versao carimbada (ver servicos-api, acao assinar_anexo).
-- assinaturas_necessarias=2 habilita "mao dupla" (solicitante + aprovador destino da
-- solicitacao); o status (nao assinado / parcial / completo) e derivado comparando essa
-- coluna com a contagem de linhas em assinaturas_anexo, sem coluna "assinado" redundante.

alter table gestao_servicos.anexos_solicitacao
  add column if not exists assinaturas_necessarias smallint not null default 1
    check (assinaturas_necessarias between 1 and 2);

create table if not exists gestao_servicos.assinaturas_anexo (
  id uuid primary key default gen_random_uuid(),
  anexo_id uuid not null references gestao_servicos.anexos_solicitacao(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  papel text not null check (papel in ('solicitante', 'aprovador')),
  posicao jsonb not null,
  assinado_em timestamptz not null default now(),
  unique (anexo_id, colaborador_id)
);

create index if not exists idx_servicos_assinaturas_anexo_anexo_id
  on gestao_servicos.assinaturas_anexo (anexo_id);

alter table gestao_servicos.assinaturas_anexo enable row level security;

-- Mesma regra de visibilidade de anexos_solicitacao (aprovador ve tudo, solicitante so os
-- proprios) -- a mutacao em si e feita pela edge function via conexao direta (bypassa RLS),
-- esta policy so cobre acesso direto via PostgREST/client, defesa em profundidade.
drop policy if exists "servicos_assinaturas_anexo_select" on gestao_servicos.assinaturas_anexo;
create policy "servicos_assinaturas_anexo_select" on gestao_servicos.assinaturas_anexo
for select to authenticated
using (
  exists (
    select 1
    from gestao_servicos.anexos_solicitacao an
    join gestao_servicos.solicitacoes_pagamento sp on sp.id = an.solicitacao_id
    where an.id = assinaturas_anexo.anexo_id
      and (
        public.servicos_is_aprovador()
        or (public.servicos_has_access() and sp.solicitante_id = public.current_colaborador_id())
      )
  )
);

grant select on gestao_servicos.assinaturas_anexo to authenticated;
grant select, insert on gestao_servicos.assinaturas_anexo to service_role;

notify pgrst, 'reload schema';
