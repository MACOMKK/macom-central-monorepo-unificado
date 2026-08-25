-- Expande gestao_servicos.fornecedores alem do nome, para o Financeiro poder
-- registrar dados fiscais/contato/bancarios do fornecedor. Todas as colunas
-- novas sao nullable: o cadastro existente so tem `nome` e nao pode quebrar.

alter table gestao_servicos.fornecedores
  add column if not exists tipo_pessoa text check (tipo_pessoa in ('fisica', 'juridica')),
  add column if not exists documento text,
  add column if not exists inscricao_estadual text,
  add column if not exists email text,
  add column if not exists telefone text,
  add column if not exists endereco text,
  add column if not exists cidade text,
  add column if not exists uf text,
  add column if not exists cep text,
  add column if not exists banco text,
  add column if not exists agencia text,
  add column if not exists conta text,
  add column if not exists tipo_conta text,
  add column if not exists chave_pix text;

create unique index if not exists idx_servicos_fornecedores_documento
  on gestao_servicos.fornecedores (documento)
  where documento is not null and documento <> '';

notify pgrst, 'reload schema';
