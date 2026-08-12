-- Inscricoes de Web Push (Service Worker + Push API), compartilhadas entre todos os apps do
-- monorepo -- por isso fica em `public`, nao em um schema `gestao_*` especifico. Cada linha e
-- um "dispositivo" (endpoint do navegador) inscrito por um colaborador, num app (`sistema`,
-- mesmo slug de `public.sistemas`). Um colaborador pode ter varias linhas (varios navegadores/
-- dispositivos) e o mesmo endpoint pode se repetir entre apps diferentes (por isso o unique e
-- composto, nao so no endpoint).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  sistema text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  criado_em timestamptz not null default now(),
  unique (sistema, endpoint)
);

create index if not exists idx_push_subscriptions_colaborador_sistema
  on public.push_subscriptions (colaborador_id, sistema);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_self" on public.push_subscriptions;
create policy "push_subscriptions_select_self"
  on public.push_subscriptions
  for select
  using (colaborador_id = public.current_colaborador_id());

drop policy if exists "push_subscriptions_insert_self" on public.push_subscriptions;
create policy "push_subscriptions_insert_self"
  on public.push_subscriptions
  for insert
  with check (colaborador_id = public.current_colaborador_id());

drop policy if exists "push_subscriptions_delete_self" on public.push_subscriptions;
create policy "push_subscriptions_delete_self"
  on public.push_subscriptions
  for delete
  using (colaborador_id = public.current_colaborador_id());

grant select, insert, delete on public.push_subscriptions to authenticated, service_role;
