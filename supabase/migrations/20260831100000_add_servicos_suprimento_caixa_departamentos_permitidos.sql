alter table gestao_servicos.configuracoes_modulo
  add column if not exists suprimento_caixa_departamentos_permitidos uuid[];
