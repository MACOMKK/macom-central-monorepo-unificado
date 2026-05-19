alter table gestao_intranet.perfis_colaboradores
  drop constraint if exists perfis_colaboradores_criado_por_fkey;

alter table gestao_intranet.perfis_colaboradores
  drop column if exists criado_por;
