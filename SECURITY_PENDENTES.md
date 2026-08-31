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
- **Item 8 — XSS via `embed_code` em Relatórios**: corrigido em `ReportViewer.jsx`. Conferidos os
  15 `embed_code` salvos no banco (`gestao_relatorio.relatorios`) — todos iframes simples de
  `app.powerbi.com`/`datastudio.google.com`. Trocado `dangerouslySetInnerHTML` por extração do
  `src` com validação de protocolo (`https:`) e allow-list de host (`app.powerbi.com`,
  `datastudio.google.com`, `lookerstudio.google.com`); `embed_code` que não bater nesse padrão
  agora mostra mensagem de erro em vez de renderizar HTML bruto. Nenhum relatório existente é
  afetado. Falta apenas o build/deploy do app `relatorios` (frontend, sem Edge Function/migration
  envolvida).
- **Item 4 — IP spoofing na intranet**: corrigido em `intranet-api/index.ts` (`getClientIp`).
  Decisão do usuário: manter o acesso automático por IP da rede do escritório (é só consulta, sem
  ação sensível). O problema era que `getClientIp` aceitava `x-real-ip`/`x-forwarded-for`/
  `forwarded` como fallback — headers que qualquer requisição externa pode forjar manualmente,
  permitindo logar como o usuário `trusted_ip` sem nenhuma credencial. Agora usa só
  `cf-connecting-ip`, que o Cloudflare sobrescreve na borda e o cliente não controla. Falta apenas
  o deploy da Edge Function `intranet-api`.
- **Item 1 — RLS em `sistemas`/`acessos_usuario_sistema`**: corrigido e validado em produção
  (migration `20260826170000_enable_rls_sistemas_acessos_usuario_sistema.sql`, aplicada via
  `npx supabase db push`). Levantamento minucioso nos 7 apps + pacotes `@macom/*` confirmou que
  nenhum app lê/grava essas tabelas via `supabase-js` direto do client — tudo passa por Edge
  Function (`central-api`, `plataforma-api`, `relatorios-api`, `catalog-api`), que usam conexão
  `DATABASE_URL`/`service_role` e não são afetadas por RLS. O risco real era que
  `acessos_usuario_sistema` tinha `grant insert/update/delete` liberado para `authenticated` sem
  RLS, permitindo qualquer usuário autenticado se auto-promover admin de um sistema via
  `supabase.from('acessos_usuario_sistema').update(...)` direto do navegador. A migration habilita
  RLS nas duas tabelas, mantém `select` liberado para `authenticated` (leitura inalterada) e revoga
  `insert/update/delete` de `authenticated` (só Edge Functions gravam). Testado via Playwright
  contra produção, logado como usuário comum: `select` em ambas as tabelas segue `200`; `update`
  de `nivel_acesso` para `admin`, `insert` em `acessos_usuario_sistema` e `insert` em `sistemas`
  direto via REST (sem passar por Edge Function) agora retornam `403 permission denied`.

### Lockout progressivo — pendências antigas fechadas
- Migrations `20260825130000_add_login_lockout_hook.sql` e
  `20260825140000_add_logs_acesso_email_index.sql` aplicadas em produção.
- Edge Functions `security-check-login-lock` e `security-log-login-success` implantadas.

## 🟡 Baixa prioridade (sem urgência agora)

## 🔲 Falta implementar

Nenhum item de código restante. Falta apenas o deploy da Edge Function `intranet-api` (item 4) e o
build/deploy do app `relatorios` (item 8) — item 1 (RLS) já aplicado e validado em produção.

`minimum_password_length = 8` também já foi replicado no Dashboard de produção. Todas as
pendências antigas (de antes desta sessão) estão fechadas.

## 🔲 Itens LOW ainda sem plano definido

- `apps/crm/src/components/ui/chart.jsx`: `dangerouslySetInnerHTML` com config estática — risco
  baixo, sem ação necessária agora.
