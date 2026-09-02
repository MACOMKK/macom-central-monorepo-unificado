# Generalização do envio de e-mail de notificação — status

> Acompanhamento da tarefa iniciada em 2026-09-02. Convenção rápida de uso está no `CLAUDE.md`
> raiz, seção "Notificação por e-mail". Este arquivo é só o status/checklist detalhado.

## Contexto

Antes desta tarefa, a lógica de transporte de e-mail (`sendGmail`: troca OAuth + montagem MIME)
estava **duplicada** entre `supabase/functions/enviar-termo-gmail/index.ts` e
`supabase/functions/processa-fila-email/index.ts`, e só o domínio `servicos-api` sabia enfileirar
e-mail (SQL cru direto na tabela `notificacoes.fila_emails`) — qualquer outro app que precisasse
notificar por e-mail teria que reimplementar tudo do zero.

**Gatilho:** dois problemas relatados pelo usuário ao mesmo tempo — "o termo de posse não envia" e
"o e-mail do serviços não está funcionando" — apontavam para a mesma causa raiz: falha na troca do
`GMAIL_REFRESH_TOKEN` por access token via OAuth2, usada igualmente pelas duas functions.

## Checklist por nível

| # | Nível | Status | Detalhe |
|---|---|---|---|
| 0 | Diagnóstico e correção do token Gmail | ✅ FEITO (2026-09-02) | Novo OAuth Client gerado no Google Cloud Console e novo `GMAIL_REFRESH_TOKEN` obtido via OAuth Playground (escopo `gmail.send`, conta `kevinkleymacom@gmail.com`). `GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN`/`GMAIL_SENDER` atualizados via `supabase secrets set` pelo usuário. Validação ponta a ponta (teste real de envio) ainda não confirmada. |
| 1 | Extrair `_shared/email.ts` (elimina duplicação) | ✅ FEITO (2026-09-02) | Criado `supabase/functions/_shared/email.ts` com `sendGmail` (transporte) e `enqueueEmail` (enfileiramento). `enviar-termo-gmail/index.ts` e `processa-fila-email/index.ts` agora importam de lá, sem código duplicado. Sem mudança de comportamento externo. |
| 2 | Helper `enqueueEmail` genérico | ✅ FEITO (2026-09-02) | `servicos-api/index.ts` (`enqueueStatusEmail` e `notifySolicitantePendencia`) migrado do `insert` SQL cru para `enqueueEmail(sql, {...})`. |
| 3 | Documentação do padrão | ✅ FEITO (2026-09-02) | Seção "Notificação por e-mail" no `CLAUDE.md` raiz; referência desatualizada de `fila_emails`/`gestao_ativos` corrigida em `apps/central/CLAUDE.md`. Exemplo opcional de uso em um app novo (crm/intranet) **não** foi implementado — ninguém pediu um caso de uso real ainda, fica para quando surgir necessidade. |
| 4 | Hardening (secret do cron, log de falha silenciosa) | ⚠️ PARCIAL (2026-09-02) | Log da falha silenciosa: **feito** — `enqueueStatusEmail`/`notifySolicitantePendencia` agora chamam `console.error` com o id do solicitante/solicitação quando o colaborador não tem e-mail cadastrado, em vez de sair em silêncio. Rotação do `INTERNAL_INVOKE_SECRET` (hardcoded em texto puro na migration `20260826160000_add_invoke_secret_header_cron_jobs.sql`, versionado no git): **adiada por decisão do usuário** (2026-09-02) — precisa de uma migration nova pro `pg_cron` coordenada com `supabase secrets set`, e um descompasso derruba `processa-fila-email`/`servicos-lembrete-aprovacoes` em produção. Retomar só quando o usuário quiser fazer essa coordenação. |

## Credenciais Gmail migradas para o schema `integracoes` (2026-09-02)

As credenciais do Gmail (`client_id`, `client_secret`, `refresh_token`, `sender`) saíram das
env vars `GMAIL_*` do Supabase e passaram a ser geridas pela tela **Integrações** do Console
(`apps/admin`), gravadas em `integracoes.integracoes`/`integracoes.integracoes_secrets` (segredos
no Supabase Vault). `_shared/email.ts` (`sendGmail`) lê essas credenciais via
`integracoes.get_credenciais('gmail_notificacoes')` — **não há mais fallback para as env vars**,
elas foram removidas do código e desativadas via `supabase secrets unset` (única fonte agora é a
tabela). Se o Termo de Posse ou o `processa-fila-email` pararem de enviar, o primeiro lugar a
checar é a integração `gmail_notificacoes` na tela Integrações (ativa? credenciais completas?) e o
schema `integracoes` estar exposto em Settings > API > Data API.

## ⚠️ Notificação por e-mail do `servicos` temporariamente DESATIVADA

A pedido do usuário (2026-09-02), o envio de e-mail do `servicos-api` foi suspenso enquanto a
credencial Gmail é revalidada em produção — `enqueueStatusEmail` e a parte de e-mail de
`notifySolicitantePendencia` agora saem cedo por causa da flag `EMAIL_NOTIFICATIONS_ENABLED = false`
(topo da função `enqueueStatusEmail`, `servicos-api/index.ts`). **O aviso in-app/push (sino,
`insertNotificacao`) continua funcionando normalmente** — só o e-mail está suspenso. O Termo de
Posse (`enviar-termo-gmail`) **não** foi desativado, continua ativo. Para reverter: apagar a linha
`const EMAIL_NOTIFICATIONS_ENABLED = false;` e os dois `if (!EMAIL_NOTIFICATIONS_ENABLED) return;`
que ela controla.

## Arquivos alterados até agora

- `supabase/functions/_shared/email.ts` (novo)
- `supabase/functions/enviar-termo-gmail/index.ts`
- `supabase/functions/processa-fila-email/index.ts`
- `supabase/functions/servicos-api/index.ts`
- `CLAUDE.md` (raiz)
- `apps/central/CLAUDE.md`

Nenhuma migration nova foi necessária até agora — o schema `notificacoes.fila_emails` já era
genérico e correto. Uma migration nova só entra em cena se/quando o item de rotação do secret do
Nível 4 for retomado.

## Próximo passo

Nível 0 (usuário): confirmar/regerar o `GMAIL_REFRESH_TOKEN` no Google Cloud Console e validar com
um envio de teste real (Termo de Posse) que a fila volta a sair de `erro`/`pendente` para `enviado`.
