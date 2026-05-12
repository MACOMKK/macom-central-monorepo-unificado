grant select on table public.sistemas to authenticated;

grant select, insert, update, delete on table public.acessos_usuario_sistema to authenticated;

alter table public.sistemas disable row level security;
alter table public.acessos_usuario_sistema disable row level security;
