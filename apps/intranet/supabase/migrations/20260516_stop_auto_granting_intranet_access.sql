create or replace function public.sync_auth_user_to_colaborador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.colaboradores (
    id,
    nome,
    email,
    funcao,
    status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'usuario',
    'ativo'
  )
  on conflict (id) do update
    set nome = excluded.nome,
        email = excluded.email,
        atualizado_em = now();

  insert into gestao_intranet.perfis_colaboradores (colaborador_id)
  values (new.id)
  on conflict (colaborador_id) do nothing;

  return new;
end;
$$;
