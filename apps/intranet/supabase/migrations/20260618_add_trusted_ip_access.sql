create table if not exists gestao_intranet.acessos_ip_confiavel (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ip_cidr cidr not null,
  nivel_acesso text not null default 'usuario' check (nivel_acesso in ('admin', 'usuario')),
  mod_avisos text not null default 'view' check (mod_avisos in ('none', 'view', 'edit')),
  mod_links text not null default 'view' check (mod_links in ('none', 'view', 'edit')),
  mod_colaboradores text not null default 'view' check (mod_colaboradores in ('none', 'view', 'edit')),
  mod_documentos text not null default 'view' check (mod_documentos in ('none', 'view', 'edit')),
  mod_calendario text not null default 'view' check (mod_calendario in ('none', 'view', 'edit')),
  mod_conhecimento text not null default 'view' check (mod_conhecimento in ('none', 'view', 'edit')),
  mod_feedback text not null default 'view' check (mod_feedback in ('none', 'view', 'edit')),
  ativo boolean not null default true,
  ultimo_ip text,
  ultimo_acesso_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (ip_cidr)
);

drop trigger if exists set_updated_at_acessos_ip_confiavel on gestao_intranet.acessos_ip_confiavel;
create trigger set_updated_at_acessos_ip_confiavel
before update on gestao_intranet.acessos_ip_confiavel
for each row execute function public.set_updated_at();
