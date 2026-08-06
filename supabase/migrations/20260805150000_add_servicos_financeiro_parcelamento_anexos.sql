-- Evolucao do modelo do modulo Financeiro (apps/servicos) para migrar o antigo
-- fluxo de requisicao financeira do AppSheet: titulo/empresa/setor na solicitacao,
-- anexos multi-arquivo por categoria, pagamento parcelado e timeline de eventos.
-- Mantem a maquina de estados atual (pendente -> aprovado|reprovado -> pago) e o
-- unico nivel de aprovacao ja existente.

alter table gestao_servicos.solicitacoes_pagamento
  add column if not exists numero bigint generated always as identity,
  add column if not exists titulo text not null default '',
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null,
  add column if not exists departamento_id uuid references public.departamentos(id) on delete set null,
  add column if not exists observacao text,
  add column if not exists aprovador_destino_id uuid references public.colaboradores(id) on delete set null;

create unique index if not exists idx_servicos_solicitacoes_numero
  on gestao_servicos.solicitacoes_pagamento (numero);

-- Parcelas: cada solicitacao aprovada ganha 1+ parcelas (1 = a vista, o caso
-- comum hoje). "Tipo pagamento"/"status pagamento" da planilha legada nao viram
-- colunas - sao derivados agregando esta tabela na query da tela.
create table if not exists gestao_servicos.parcelas_pagamento (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references gestao_servicos.solicitacoes_pagamento(id) on delete cascade,
  numero smallint not null,
  valor numeric(12, 2) not null check (valor > 0),
  data_vencimento date,
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  data_pagamento timestamptz,
  pago_por uuid references public.colaboradores(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (solicitacao_id, numero)
);

create index if not exists idx_servicos_parcelas_solicitacao_id
  on gestao_servicos.parcelas_pagamento (solicitacao_id);

-- Quando a ultima parcela de uma solicitacao e quitada, a propria solicitacao
-- passa a 'pago' automaticamente - mantem status da solicitacao como fonte
-- unica de verdade pra quem so quer saber "esta pago ou nao", sem agregar
-- parcelas em toda query de listagem.
create or replace function gestao_servicos.parcelas_pagamento_rollup()
returns trigger
language plpgsql
security definer
set search_path = gestao_servicos, public
as $$
begin
  if new.status = 'pago' and not exists (
    select 1
    from gestao_servicos.parcelas_pagamento
    where solicitacao_id = new.solicitacao_id
      and status <> 'pago'
  ) then
    update gestao_servicos.solicitacoes_pagamento
    set status = 'pago', pago_em = now(), pago_por = new.pago_por
    where id = new.solicitacao_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_servicos_parcelas_rollup on gestao_servicos.parcelas_pagamento;
create trigger trg_servicos_parcelas_rollup
after update of status on gestao_servicos.parcelas_pagamento
for each row
when (new.status = 'pago')
execute function gestao_servicos.parcelas_pagamento_rollup();

-- Anexos: substitui o comprovante_path unico por multiplos arquivos com
-- categoria, no molde de gestao_comunicacao.anexos_mensagem.
create table if not exists gestao_servicos.anexos_solicitacao (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references gestao_servicos.solicitacoes_pagamento(id) on delete cascade,
  parcela_id uuid references gestao_servicos.parcelas_pagamento(id) on delete cascade,
  categoria text not null check (categoria in (
    'comprovante_solicitacao',
    'nf_boleto',
    'pdf_unificado',
    'rh',
    'comprovante_pagamento'
  )),
  nome_arquivo text not null,
  tipo_mime text not null,
  tamanho_bytes bigint not null,
  storage_path text not null,
  criado_por uuid references public.colaboradores(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_servicos_anexos_solicitacao_id
  on gestao_servicos.anexos_solicitacao (solicitacao_id);
create index if not exists idx_servicos_anexos_parcela_id
  on gestao_servicos.anexos_solicitacao (parcela_id);

-- Historico: timeline unica de eventos, substitui as 3 colunas de observacao
-- solta da planilha legada (contas a pagar / financeiro / RH).
create table if not exists gestao_servicos.historico_solicitacao (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references gestao_servicos.solicitacoes_pagamento(id) on delete cascade,
  evento text not null,
  autor_id uuid references public.colaboradores(id) on delete set null,
  observacao text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_servicos_historico_solicitacao_id
  on gestao_servicos.historico_solicitacao (solicitacao_id, criado_em desc);

-- Bucket de comprovantes ganha validacao no proprio storage (hoje so em
-- codigo) e path organizado por solicitacao/categoria.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ]
where id = 'comprovantes-pagamento';

alter table gestao_servicos.parcelas_pagamento enable row level security;
alter table gestao_servicos.anexos_solicitacao enable row level security;
alter table gestao_servicos.historico_solicitacao enable row level security;

drop policy if exists "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento;
create policy "servicos_parcelas_select" on gestao_servicos.parcelas_pagamento
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = parcelas_pagamento.solicitacao_id
      and (
        public.servicos_is_aprovador()
        or (public.servicos_has_access() and sp.solicitante_id = public.current_colaborador_id())
      )
  )
);

drop policy if exists "servicos_parcelas_write_financeiro" on gestao_servicos.parcelas_pagamento;
create policy "servicos_parcelas_write_financeiro" on gestao_servicos.parcelas_pagamento
for all to authenticated
using (public.servicos_is_financeiro())
with check (public.servicos_is_financeiro());

drop policy if exists "servicos_anexos_select" on gestao_servicos.anexos_solicitacao;
create policy "servicos_anexos_select" on gestao_servicos.anexos_solicitacao
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = anexos_solicitacao.solicitacao_id
      and (
        public.servicos_is_aprovador()
        or (public.servicos_has_access() and sp.solicitante_id = public.current_colaborador_id())
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
      and (
        public.servicos_is_aprovador()
        or (public.servicos_has_access() and sp.solicitante_id = public.current_colaborador_id())
      )
  )
);

drop policy if exists "servicos_anexos_delete" on gestao_servicos.anexos_solicitacao;
create policy "servicos_anexos_delete" on gestao_servicos.anexos_solicitacao
for delete to authenticated
using (
  criado_por = public.current_colaborador_id()
  and exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = anexos_solicitacao.solicitacao_id
      and sp.status = 'pendente'
  )
);

drop policy if exists "servicos_historico_select" on gestao_servicos.historico_solicitacao;
create policy "servicos_historico_select" on gestao_servicos.historico_solicitacao
for select to authenticated
using (
  exists (
    select 1 from gestao_servicos.solicitacoes_pagamento sp
    where sp.id = historico_solicitacao.solicitacao_id
      and (
        public.servicos_is_aprovador()
        or (public.servicos_has_access() and sp.solicitante_id = public.current_colaborador_id())
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
      and (
        public.servicos_is_aprovador()
        or (public.servicos_has_access() and sp.solicitante_id = public.current_colaborador_id())
      )
  )
);

grant select, insert, update, delete on gestao_servicos.parcelas_pagamento to authenticated, service_role;
grant select, insert, delete on gestao_servicos.anexos_solicitacao to authenticated, service_role;
grant select, insert on gestao_servicos.historico_solicitacao to authenticated, service_role;

notify pgrst, 'reload schema';
