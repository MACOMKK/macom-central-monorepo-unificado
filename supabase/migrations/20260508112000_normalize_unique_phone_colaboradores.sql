update public.colaboradores
set telefone = nullif(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), '')
where telefone is not null;
drop index if exists public.colaboradores_telefone_unique_idx;
create unique index if not exists colaboradores_telefone_unique_idx
  on public.colaboradores (telefone)
  where telefone is not null;
