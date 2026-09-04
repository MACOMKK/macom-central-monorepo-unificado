-- Aviso de atualizacao generico, cross-app: um aviso ativo por sistema (sistema_slug), com
-- aceite versionado por colaborador. Vive em public (mesmo padrao de colaboradores/sistemas/
-- acessos_usuario_sistema) em vez de um schema dedicado, por ser so duas tabelas simples sem
-- infra propria (sem cron/retry, ao contrario de notificacoes.fila_emails).
create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  sistema_slug text not null,
  titulo text not null,
  mensagem text not null,
  versao integer not null default 1,
  obrigatorio boolean not null default true,
  ativo boolean not null default true,
  criado_por uuid references public.colaboradores(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- so um aviso ativo por sistema de cada vez
create unique index avisos_one_active_per_sistema_idx
  on public.avisos (sistema_slug) where ativo = true;

drop trigger if exists trg_avisos_set_updated_at on public.avisos;
create trigger trg_avisos_set_updated_at
before update on public.avisos
for each row
execute function public.set_updated_at();

create table public.avisos_aceites (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references public.avisos(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  versao_aceita integer not null,
  aceito_em timestamptz not null default now(),
  constraint avisos_aceites_unique unique (aviso_id, colaborador_id)
);

create index idx_avisos_aceites_colaborador_id
  on public.avisos_aceites (colaborador_id);

grant select, insert, update, delete on public.avisos to authenticated, service_role;
grant select, insert, update, delete on public.avisos_aceites to authenticated, service_role;
