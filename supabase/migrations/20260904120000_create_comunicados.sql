-- Comunicado nao-bloqueante e cross-app (ex.: aniversariante do dia), separado de public.avisos
-- de proposito: aqui pode haver varios itens ativos ao mesmo tempo (sem indice de "1 ativo por
-- sistema"), nao ha aceite/bloqueio (sem tabela *_aceites), e a exibicao e por janela de datas
-- (ativo_de/ativo_ate) em vez de um flag ativo/inativo manual. Fica em public pelo mesmo motivo de
-- public.avisos: e conteudo lido direto pelo frontend via Edge Function sincrona, nao uma fila de
-- job de envio (isso e notificacoes.fila_emails).
create table public.comunicados (
  id uuid primary key default gen_random_uuid(),
  sistema_slug text not null,
  tipo text not null default 'geral',
  titulo text not null,
  mensagem text,
  -- caminho no Storage (bucket dedicado, ex. "comunicados"), nunca a imagem em si na tabela --
  -- mesmo padrao de public.anexos/storage_path no financeiro.
  foto_path text,
  -- de quem e o aniversario, quando tipo = 'aniversario'; null para comunicados gerais.
  colaborador_id uuid references public.colaboradores(id) on delete set null,
  ativo_de date not null default current_date,
  ativo_ate date not null default current_date,
  criado_por uuid references public.colaboradores(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint comunicados_janela_valida check (ativo_ate >= ativo_de)
);

create index idx_comunicados_sistema_slug_janela
  on public.comunicados (sistema_slug, ativo_de, ativo_ate);

drop trigger if exists trg_comunicados_set_updated_at on public.comunicados;
create trigger trg_comunicados_set_updated_at
before update on public.comunicados
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on public.comunicados to authenticated, service_role;
