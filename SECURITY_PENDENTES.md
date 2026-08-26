# Auditoria de segurança — resumo geral (feito x pendente)

> Detalhes completos em `SECURITY_AUDIT.md`. Este arquivo é só um resumo de status.

## ✅ Feito

### Proteção contra força bruta no login
- CAPTCHA (Cloudflare Turnstile) no login dos 7 apps.
- Rate limit nativo do Supabase Auth apertado (10 tentativas/5min por IP).
- Senha mínima aumentada de 6 para 8 caracteres (`config.toml`).
- Alerta por e-mail para admins em picos de tentativas falhas (cron a cada 15min).
- Lockout progressivo por conta — fallback client-side implementado (hook nativo pronto no banco,
  mas bloqueado por exigir plano Team/Enterprise do Supabase).

### Lote 1 (implantado em produção em 2026-08-26)
- **Item 2** — SQL Injection via `orderBy` em `intranet-api`: corrigido.
- **Item 3** — `enviar-termo-gmail` sem autenticação: agora exige JWT.
- **Item 5** — `plataforma-api`: gestor não redefine mais senha de outro gestor.
- **Item 6** — `plataforma-api`: permissões do Console agora exigem admin global.
- **Item 7** — `central-api`: escalada entre sistemas via update corrigida.
- Vazamento de erro cru do Postgres ao cliente (`intranet-api`) corrigido.
- `deleteSystemAccess` (`plataforma-api`) valida nível antes de excluir.
- `central-api`: delete de colaborador admin/gestor bloqueado para não-global-admin.
- `catalog-api`: `id` removido do create de colaboradores; `sistemas` e `logs_auditoria` protegidos.
- `crm-api`: `historico_atendimentos` valida escopo mesmo sem `lead_id`.
- `servicos-api`: `criar_fornecedor` agora exige financeiro.
- RLS habilitada em `empresas`/`cargos` (nova migration).

### Extra (fora do lote 1)
- IDOR na remoção de reação de aviso (`intranet-api`): corrigido e implantado.
- Secret de invocação (`x-invoke-secret`) em `processa-fila-email` e `servicos-lembrete-aprovacoes`:
  implantado, secret configurado, cron atualizado. Validado em produção — sem o header retorna 401,
  com o header correto retorna 200.

### Lockout progressivo — pendências antigas fechadas
- Migrations `20260825130000_add_login_lockout_hook.sql` e
  `20260825140000_add_logs_acesso_email_index.sql` aplicadas em produção.
- Edge Functions `security-check-login-lock` e `security-log-login-success` implantadas.

## 🟡 Baixa prioridade (sem urgência agora)

- `limpar_dados_teste_financeiro` (`servicos-api`): delete não seletivo de toda a tabela de
  pagamentos, mas confirmado que só é usado em teste (sistema ainda não lançado). Revisar antes do
  lançamento em produção.

## 🔲 Falta implementar — ordem sugerida (mais seguro → mais arriscado)

1. **Item 8 — XSS via `embed_code` em Relatórios** — precisa checar no banco quais `embed_code` já
   estão salvos antes de trocar `dangerouslySetInnerHTML` por extração/validação de `src`.
2. **Item 4 — IP spoofing na intranet** — precisa confirmar se o "acesso automático por rede do
   escritório" está em uso ativo antes de remover.
3. **Item 1 — RLS em `acessos_usuario_sistema`/`sistemas`** — o mais arriscado de toda a auditoria
   (tabela da qual toda checagem de permissão do monorepo depende). Precisa levantar todos os usos
   dessas tabelas no frontend dos 7 apps antes de reabilitar RLS. Sempre por último.

`minimum_password_length = 8` também já foi replicado no Dashboard de produção. Todas as
pendências antigas (de antes desta sessão) estão fechadas.

## 🔲 Itens LOW ainda sem plano definido

- `apps/crm/src/components/ui/chart.jsx`: `dangerouslySetInnerHTML` com config estática — risco
  baixo, sem ação necessária agora.
