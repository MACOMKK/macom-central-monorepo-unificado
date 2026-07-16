update public.contatos
set telefone = nullif(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), '')
where telefone is not null;

create unique index if not exists contatos_telefone_unique_idx
  on public.contatos (telefone)
  where telefone is not null;
