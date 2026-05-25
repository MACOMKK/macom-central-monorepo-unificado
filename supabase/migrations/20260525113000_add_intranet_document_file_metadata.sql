alter table gestao_intranet.documentos
  add column if not exists arquivo_path text,
  add column if not exists arquivo_nome text,
  add column if not exists arquivo_tipo text,
  add column if not exists arquivo_tamanho bigint;

update gestao_intranet.documentos
set
  arquivo_path = coalesce(
    arquivo_path,
    nullif(
      regexp_replace(
        coalesce(arquivo_url, ''),
        '^.*?/object/public/documents/',
        ''
      ),
      ''
    )
  ),
  arquivo_nome = coalesce(
    arquivo_nome,
    nullif(split_part(coalesce(arquivo_url, ''), '/', array_length(string_to_array(coalesce(arquivo_url, ''), '/'), 1)), '')
  )
where arquivo_url is not null;
