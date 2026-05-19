alter table public.sistemas enable row level security;
alter table public.acessos_usuario_sistema enable row level security;

drop policy if exists "sistemas_read_authenticated" on public.sistemas;
create policy "sistemas_read_authenticated"
on public.sistemas
for select
to authenticated
using (true);

drop policy if exists "sistemas_admin_manage" on public.sistemas;
create policy "sistemas_admin_manage"
on public.sistemas
for all
to authenticated
using (public.is_intranet_admin())
with check (public.is_intranet_admin());

drop policy if exists "acessos_read_self_or_admin" on public.acessos_usuario_sistema;
create policy "acessos_read_self_or_admin"
on public.acessos_usuario_sistema
for select
to authenticated
using (colaborador_id = auth.uid() or public.is_intranet_admin());

drop policy if exists "acessos_admin_manage" on public.acessos_usuario_sistema;
create policy "acessos_admin_manage"
on public.acessos_usuario_sistema
for all
to authenticated
using (public.is_intranet_admin())
with check (public.is_intranet_admin());
