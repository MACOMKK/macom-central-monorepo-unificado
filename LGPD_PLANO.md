# Plano — Adequação LGPD no monorepo MACOM

## Contexto

Auditoria (`SECURITY_CHECKLIST_20.md`) focou em segurança técnica, não em conformidade legal. Levantamento nas migrations do Supabase mostrou que dados pessoais (CPF, e-mail, telefone, data de nascimento, endereço, IP) circulam por várias tabelas sem nenhum mecanismo de LGPD: sem registro de consentimento, sem rota de exclusão/anonimização a pedido do titular, sem política de retenção, e CPF trafega em texto plano. RLS/hash de senha/HTTPS já existentes ajudam na segurança do dado, mas não substituem conformidade LGPD.

Tabelas com dado pessoal identificadas:
- `public.colaboradores` — CPF, e-mail, telefone
- `public.termos_posse` — `colaborador_cpf` solto
- `gestao_intranet.perfis_colaboradores` — data de nascimento
- `gestao_crm.clientes` / `gestao_crm.leads` — nome, telefone, e-mail
- `public.contatos` — nome, empresa, telefone, e-mail
- `gestao_servicos.fornecedores` — endereço, CEP
- `base.logs_auditoria` — `endereco_ip` (retenção indefinida)

Objetivo deste plano: fechar as lacunas de conformidade em ordem de risco/impacto, priorizando CRM (dados de terceiros/clientes) e CPF (dado sensível).

## Escopo e prioridades

### 1. Consentimento (CRM — leads/clientes)
- Adicionar colunas `consentimento_aceito_em timestamptz`, `consentimento_finalidade text` em `gestao_crm.leads` e `gestao_crm.clientes` (migration nova em `supabase/migrations/`).
- Ajustar formulário de cadastro de lead no `crm` (apps/crm) para capturar e persistir o aceite.
- Atualizar `crm-api` (Edge Function) para validar/gravar o campo no `POST` de criação de lead.

### 2. Direito de exclusão/anonimização (titular pede remoção)
- Nova função SQL `gestao_crm.anonimizar_cliente(cliente_id uuid)` que sobrescreve nome/telefone/email por placeholders, mantendo o histórico de atendimento sem PII.
- Endpoint novo em `crm-api` (`POST /clientes/:id/anonimizar`), restrito a admin/gestor, reaproveitando o padrão de auth já usado pelas demais rotas.
- Repetir o mesmo padrão depois para `colaboradores` (RH/Central) caso vire prioridade — registrar como item futuro, não implementar agora.

### 3. Proteção do CPF
- Avaliar `pgcrypto` (`pgp_sym_encrypt`/`pgp_sym_decrypt`) para a coluna `cpf` de `public.colaboradores` e `colaborador_cpf` de `public.termos_posse`.
- Alternativa mais simples: manter em texto mas mascarar na resposta das Edge Functions (ex: `123.***.***-11`) exceto para quem tem permissão explícita — decidir com o usuário qual caminho antes de implementar (encriptação em repouso é mais forte, mas exige migração de dados existentes e ajuste em toda leitura/escrita).

### 4. Retenção de logs (`base.logs_auditoria`)
- Definir período de retenção (ex: 12 meses) e criar `pg_cron` job (já existe `pg_cron` usado em `processa_fila_email`) para expurgar/anonimizar `endereco_ip` de registros antigos.

### 5. Validação de inputs (reaproveita item #14 do checklist de segurança)
- Ao mexer nos endpoints acima, já adotar Zod (`@macom/validation`) nos payloads tocados, já que essas Edge Functions hoje não validam input — reduz retrabalho.

## Fora de escopo agora (backlog)
- Política de privacidade / termos de uso publicados no produto.
- Portal de autoatendimento do titular (hoje seria via suporte manual + endpoint admin).
- Anonimização de `colaboradores`/RH (repete o padrão do item 2, mas depende de decisão de negócio sobre desligamento de funcionário).

## Arquivos-chave
- `supabase/migrations/` — novas migrations (consentimento, função de anonimização, cron de retenção)
- `supabase/functions/crm-api/` — endpoints de consentimento e anonimização
- `apps/crm/src/` — formulário de lead/cliente (captura de consentimento)
- `packages/@macom/validation` — schemas Zod a reaproveitar

## Verificação
- Rodar migration localmente (`supabase db reset` ou equivalente do projeto) e conferir colunas novas.
- Testar endpoint de anonimização via chamada direta à Edge Function (curl/Postman) e conferir que dados de contato somem mas o histórico de atendimento permanece.
- `npm run test:crm:run` para garantir que mudanças no `crm-api`/formulário não quebram testes existentes.