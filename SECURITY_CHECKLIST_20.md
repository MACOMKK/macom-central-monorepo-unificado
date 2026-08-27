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
| 20 | Scan de dependências | ✅ JÁ TEM | script `npm run audit` configurado (2026-08-27); `npm audit fix` aplicado (23→10). `@capacitor/cli`: já na versão estável mais recente, vuln é em `xcode`/`uuid` (tooling iOS não usado) — risco aceito. `sharp` (vite-plugin-pwa/assets-generator): corrigido via `overrides` no `package.json` raiz forçando `sharp@^0.35.4` (10→7 vulnerabilidades); testado build:admin, build:crm e `generate:pwa-icons` sem regressão. `react-router-dom` atualizado de 6.26.0 para 7.18.2 no root e nos apps que fixavam versão própria (crm, servicos, relatorios, intranet — hoisting unificou tudo pra v7); testado `test:run` (mesmas 9 falhas pré-existentes, sem regressão), `typecheck` (mesmos 1195 erros pré-existentes), build de todos os 6 apps e navegação manual em central/admin/crm/relatorios/intranet/servicos (7→5 vulnerabilidades). Restam 5 (react-quill sem fix real, uuid/xcode em tooling iOS não usado) — ambos risco aceito, sem correção disponível que não seja regressiva |

## Prioridades reais (itens que realmente faltam)

Ordem do menos arriscado (implementar primeiro) para o mais arriscado:

1. **#5 — Criptografia de dados sensíveis**: avaliar quais colunas precisam de criptografia adicional além do padrão do Postgres. Pode ser feito tabela por tabela, testando isoladamente.
2. **#9 — Proteger cookies**: revisar como o Supabase Auth persiste sessão no client e reforçar flags onde aplicável. Escopo pequeno e fácil de testar (login/logout), mas erro numa flag pode derrubar sessão de todo mundo.
3. **#14 — Validação de inputs**: adotar Zod (pacote `@macom/validation` já existe) nas Edge Functions. Maior risco: mexe em todas as funções e pode passar a rejeitar payloads que hoje funcionam — implementar uma função por vez, testando o fluxo real de cada app antes de seguir pra próxima.

`#20 — Scan de dependências` saiu da lista: concluído em 2026-08-27 (script `npm run audit` + 3 etapas de correção testadas isoladamente, ver evidência na tabela acima). Ainda não configurado Dependabot/CI automático — não bloqueia o item, mas fica como melhoria futura.

Os itens marcados como **PARCIAL** (2, 7, 8, 11, 16, 17, 18) são melhorias incrementais sobre uma base que já existe, não bugs abertos.
