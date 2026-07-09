drop index if exists public.empresas_slug_unique;

alter table if exists public.empresas
  drop column if exists slug,
  drop column if exists ativo;

alter table if exists public.unidades
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

create index if not exists idx_unidades_empresa_id
  on public.unidades (empresa_id);
