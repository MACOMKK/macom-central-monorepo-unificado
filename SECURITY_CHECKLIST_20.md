# Checklist de segurança (20 itens) — status atual do monorepo

> Auditoria feita em 2026-08-26 com base no código real (Edge Functions, migrations, `.gitignore`, `config.toml`, `vercel.json`). Complementa o `SECURITY_PENDENTES.md`.

| # | Item | Status | Evidência |
|---|---|---|---|
| 1 | Esconder API Keys | ✅ JÁ TEM | `.gitignore` ignora `.env*`, só `.env.example` versionado |
| 2 | Limpar secrets do git | ⚠️ PARCIAL | sem evidência de purge de histórico do git |
| 3 | Public Key DB | ✅ JÁ TEM | client usa `VITE_SUPABASE_ANON_KEY`; `service_role` só em Edge Functions |
| 4 | Ativar RLS | ✅ JÁ TEM | RLS habilitada em 44 migrations; ajuste final aplicado em 2026-08-26 |
| 5 | Criptografia de dados | ❌ PRECISA | nenhuma criptografia além do padrão do Postgres/Supabase |
| 6 | Auth server side | ✅ JÁ TEM | Edge Functions exigem JWT (ex: `enviar-termo-gmail`) |
| 7 | Restringir acessos | ⚠️ PARCIAL | checks de nível/admin existem (`central-api`, `plataforma-api`) mas não uniformes |
| 8 | Bloquear Mass Assignment | ⚠️ PARCIAL | alguns endpoints filtram campos (`catalog-api` remove `id`), sem padrão geral |
| 9 | Proteger cookies | ❌ PRECISA | nenhum uso de `httpOnly`/`sameSite`/`secure`; sessão é gerida pelo Supabase Auth |
| 10 | Hash nas senhas | ✅ JÁ TEM | 100% delegado ao Supabase Auth |
| 11 | Rate limit | ⚠️ PARCIAL | só no login (nativo do Supabase Auth); demais Edge Functions sem limite |
| 12 | Bot protection | ✅ JÁ TEM | Cloudflare Turnstile no login dos 7 apps |
| 13 | Queries parametrizadas | ✅ JÁ TEM | SQL injection via `orderBy` corrigido no `intranet-api` |
| 14 | Validação dos inputs | ❌ PRECISA | nenhum uso de Zod (ou similar) nas Edge Functions |
| 15 | Vazar conteúdo | ✅ JÁ TEM | erro cru do Postgres corrigido no `intranet-api` |
| 16 | Restringir uploads | ⚠️ PARCIAL | `storage.from` usado em várias APIs, sem validação de tipo/tamanho |
| 17 | Trim respostas de API | ⚠️ PARCIAL | ajustes pontuais feitos (`logs_auditoria`), sem revisão geral de `SELECT` |
| 18 | Security headers | ⚠️ PARCIAL | `vercel.json` tem headers básicos, falta CSP e HSTS |
| 19 | Forçar HTTPS | ✅ JÁ TEM | garantido pela hospedagem Vercel |
| 20 | Scan de dependências | ❌ PRECISA | sem Dependabot/CI de audit; sem script `npm audit` |

## Prioridades reais (itens que realmente faltam)

1. **#14 — Validação de inputs**: adotar Zod (pacote `@macom/validation` já existe) nas Edge Functions.
2. **#9 — Proteger cookies**: revisar como o Supabase Auth persiste sessão no client e reforçar flags onde aplicável.
3. **#20 — Scan de dependências**: configurar Dependabot ou script `npm audit` no CI/local.
4. **#5 — Criptografia de dados sensíveis**: avaliar quais colunas precisam de criptografia adicional além do padrão do Postgres.

Os itens marcados como **PARCIAL** (2, 7, 8, 11, 16, 17, 18) são melhorias incrementais sobre uma base que já existe, não bugs abertos.
