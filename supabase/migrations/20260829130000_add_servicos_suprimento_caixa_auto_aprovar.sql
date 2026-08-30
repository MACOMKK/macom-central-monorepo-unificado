alter table gestao_servicos.configuracoes_modulo
  add column if not exists suprimento_caixa_auto_aprovar boolean not null default false;
