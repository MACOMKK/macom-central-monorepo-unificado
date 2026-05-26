create unique index if not exists colaboradores_email_unique_idx
  on public.colaboradores (lower(nullif(btrim(email), '')))
  where nullif(btrim(email), '') is not null;
create unique index if not exists colaboradores_telefone_unique_idx
  on public.colaboradores (nullif(btrim(telefone), ''))
  where nullif(btrim(telefone), '') is not null;
