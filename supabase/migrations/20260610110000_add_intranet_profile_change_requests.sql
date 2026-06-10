create table if not exists gestao_intranet.solicitacoes_alteracao_perfil (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  departamento_atual_id uuid references public.departamentos(id),
  departamento_solicitado_id uuid references public.departamentos(id),
  unidade_atual_id uuid references public.unidades(id),
  unidade_solicitada_id uuid references public.unidades(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  analisado_por uuid references public.colaboradores(id),
  analisado_em timestamptz
);

create index if not exists idx_solicitacoes_alteracao_perfil_colaborador
  on gestao_intranet.solicitacoes_alteracao_perfil (colaborador_id, criado_em desc);

create unique index if not exists idx_solicitacoes_alteracao_perfil_pendente
  on gestao_intranet.solicitacoes_alteracao_perfil (colaborador_id)
  where status = 'pending';
