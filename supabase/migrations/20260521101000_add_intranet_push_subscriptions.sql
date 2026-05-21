create table if not exists gestao_intranet.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time timestamptz,
  user_agent text,
  ativo boolean not null default true,
  ultimo_uso_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
drop trigger if exists set_push_subscriptions_updated_at on gestao_intranet.push_subscriptions;
create trigger set_push_subscriptions_updated_at
before update on gestao_intranet.push_subscriptions
for each row execute procedure public.set_updated_at();
alter table gestao_intranet.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_read_self_or_admin" on gestao_intranet.push_subscriptions;
create policy "push_subscriptions_read_self_or_admin"
on gestao_intranet.push_subscriptions
for select
to authenticated
using (colaborador_id = auth.uid() or public.is_intranet_admin());
drop policy if exists "push_subscriptions_insert_self_or_admin" on gestao_intranet.push_subscriptions;
create policy "push_subscriptions_insert_self_or_admin"
on gestao_intranet.push_subscriptions
for insert
to authenticated
with check (colaborador_id = auth.uid() or public.is_intranet_admin());
drop policy if exists "push_subscriptions_update_self_or_admin" on gestao_intranet.push_subscriptions;
create policy "push_subscriptions_update_self_or_admin"
on gestao_intranet.push_subscriptions
for update
to authenticated
using (colaborador_id = auth.uid() or public.is_intranet_admin())
with check (colaborador_id = auth.uid() or public.is_intranet_admin());
drop policy if exists "push_subscriptions_delete_self_or_admin" on gestao_intranet.push_subscriptions;
create policy "push_subscriptions_delete_self_or_admin"
on gestao_intranet.push_subscriptions
for delete
to authenticated
using (colaborador_id = auth.uid() or public.is_intranet_admin());
