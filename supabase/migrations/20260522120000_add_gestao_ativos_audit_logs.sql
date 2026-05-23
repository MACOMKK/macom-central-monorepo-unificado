create table if not exists gestao_ativos.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  entidade text not null,
  acao text not null
    check (
      acao in (
        'criar',
        'atualizar',
        'excluir',
        'redefinir_senha',
        'desvincular',
        'importar'
      )
    ),
  registro_id uuid,
  responsavel_colaborador_id uuid references public.colaboradores(id) on delete set null,
  responsavel_email text,
  antes jsonb,
  depois jsonb,
  metadados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists logs_auditoria_entidade_idx
  on gestao_ativos.logs_auditoria (entidade);

create index if not exists logs_auditoria_registro_id_idx
  on gestao_ativos.logs_auditoria (registro_id);

create index if not exists logs_auditoria_responsavel_colaborador_id_idx
  on gestao_ativos.logs_auditoria (responsavel_colaborador_id);

create index if not exists logs_auditoria_criado_em_idx
  on gestao_ativos.logs_auditoria (criado_em desc);

alter table gestao_ativos.logs_auditoria enable row level security;

drop policy if exists "logs_auditoria_select_admin_central" on gestao_ativos.logs_auditoria;
create policy "logs_auditoria_select_admin_central"
on gestao_ativos.logs_auditoria
for select
to authenticated
using (
  exists (
    select 1
    from public.colaboradores c
    where c.id = auth.uid()
      and c.status <> 'inativo'
      and c.funcao = 'admin'
  )
);
