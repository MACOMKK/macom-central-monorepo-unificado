alter table gestao_intranet.avisos
  add column if not exists imagem_url text,
  add column if not exists imagem_path text,
  add column if not exists imagem_nome text,
  add column if not exists imagem_tipo text,
  add column if not exists imagem_tamanho bigint;
