create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists empresas_slug_unique
  on public.empresas (slug);

create unique index if not exists empresas_nome_unique
  on public.empresas (lower(nome));

drop trigger if exists trg_empresas_set_updated_at on public.empresas;
create trigger trg_empresas_set_updated_at
before update on public.empresas
for each row
execute function public.set_updated_at();

insert into public.empresas (nome, slug)
values
  ('Macom Mitsubishi', 'macom_mitsubishi'),
  ('Macom Motos', 'macom_motos')
on conflict (slug) do nothing;

alter table public.colaboradores
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

create index if not exists idx_colaboradores_empresa_id
  on public.colaboradores (empresa_id);

grant select, insert, update, delete on public.empresas to authenticated, service_role;
