alter table gestao_ativos.termos_posse
  add column if not exists arquivo_devolucao_path text,
  add column if not exists arquivo_devolucao_nome text,
  add column if not exists arquivo_devolucao_tipo text,
  add column if not exists arquivo_devolucao_tamanho bigint;
