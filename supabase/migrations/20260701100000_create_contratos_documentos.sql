create table if not exists gestao_ativos.contratos_documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'contrato_sistema',
  fornecedor text,
  sistema_id uuid references public.sistemas(id) on delete set null,
  unidade_id uuid references public.unidades(id) on delete set null,
  data_inicio date,
  data_vencimento date,
  valor numeric(12,2),
  status text not null default 'ativo',
  responsavel_colaborador_id uuid references public.colaboradores(id) on delete set null,
  observacoes text,
  arquivo_path text,
  arquivo_nome text,
  arquivo_tipo text,
  arquivo_tamanho bigint,
  link_externo text,
  criado_por uuid references public.colaboradores(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint contratos_documentos_tipo_check check (tipo in ('contrato_sistema', 'contrato_licenca', 'aditivo', 'proposta', 'certificado', 'outro')),
  constraint contratos_documentos_status_check check (status in ('ativo', 'vencendo', 'vencido', 'encerrado'))
);

create index if not exists contratos_documentos_tipo_idx
  on gestao_ativos.contratos_documentos (tipo);
create index if not exists contratos_documentos_status_idx
  on gestao_ativos.contratos_documentos (status);
create index if not exists contratos_documentos_data_vencimento_idx
  on gestao_ativos.contratos_documentos (data_vencimento);
create index if not exists contratos_documentos_sistema_id_idx
  on gestao_ativos.contratos_documentos (sistema_id);
create index if not exists contratos_documentos_unidade_id_idx
  on gestao_ativos.contratos_documentos (unidade_id);

drop trigger if exists trg_contratos_documentos_set_updated_at on gestao_ativos.contratos_documentos;
create trigger trg_contratos_documentos_set_updated_at
before update on gestao_ativos.contratos_documentos
for each row execute function public.set_updated_at();

alter table gestao_ativos.contratos_documentos enable row level security;

drop policy if exists "contratos_documentos_select_central" on gestao_ativos.contratos_documentos;
create policy "contratos_documentos_select_central"
  on gestao_ativos.contratos_documentos
  for select
  using (public.has_system_access('central'));

drop policy if exists "contratos_documentos_manage_central" on gestao_ativos.contratos_documentos;
create policy "contratos_documentos_manage_central"
  on gestao_ativos.contratos_documentos
  for all
  using (public.has_system_access('central'))
  with check (public.has_system_access('central'));

insert into storage.buckets (id, name, public, file_size_limit)
values ('central-anexos', 'central-anexos', false, 10485760)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760;

drop policy if exists "central_anexos_contratos_documentos_select" on storage.objects;
drop policy if exists "central_anexos_contratos_documentos_insert" on storage.objects;
drop policy if exists "central_anexos_contratos_documentos_update" on storage.objects;
drop policy if exists "central_anexos_contratos_documentos_delete" on storage.objects;

create policy "central_anexos_contratos_documentos_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'contratos-documentos'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_system_access('central')
);

create policy "central_anexos_contratos_documentos_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'contratos-documentos'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_system_access('central')
);

create policy "central_anexos_contratos_documentos_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'contratos-documentos'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_system_access('central')
)
with check (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'contratos-documentos'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_system_access('central')
);

create policy "central_anexos_contratos_documentos_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'contratos-documentos'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_system_access('central')
);
insert into gestao_ativos.permissoes_central (funcao, modulo, nivel_acesso)
values ('gestor', 'contratos_documentos', 'ver')
on conflict (funcao, modulo) do nothing;