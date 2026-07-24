# Servicos — app-specific

> Este arquivo complementa o CLAUDE.md raiz do monorepo. Só documenta o que é específico deste app.

## Domínio

Sistema multi-módulo para operação de oficina/concessionária. Módulos planejados:
**Atendimento** (recepção, OS, agendamento, histórico de veículos), **Oficina** (serviços
executados, mecânicos, checklist, controle de peças), **Financeiro** (solicitação de pagamento,
contas a pagar/receber, comissões, fluxo de caixa), **Estoque** (peças, pneus, óleos, entradas e
saídas), **Compras** (solicitação, aprovação, pedido a fornecedores) e **RH** (funcionários,
férias, reembolsos — aqui restrito ao operacional da oficina; RH corporativo completo é escopo do
app `rh`, ver Convenções).

Isso substitui a decisão antiga (registrada aqui antes da migração) de que "serviços"/"portaria"
deveriam virar módulos da `intranet` — com 6 domínios operacionais distintos e volume de tela
previsto, um app próprio com arquitetura multi-módulo é o caminho certo.

Hoje só o módulo **Financeiro** está implementado — é o antigo app `pagamentos`, migrado sem
mudanças funcionais. Os demais aparecem no menu como "em breve" (`src/lib/navigation.js`,
`comingSoon: true`) sem backend ainda.

## Financeiro — solicitações e fluxo de aprovação de pagamentos

Colaborador solicita, um aprovador decide (aprovado/reprovado), o financeiro marca como pago.
Máquina de estados: `pendente → aprovado | reprovado`, e `aprovado → pago`.

### Papéis (sem Camada 2 de permissões por módulo — ainda)

Diferente da intranet, este app **não** tem hoje uma tabela de permissões por módulo própria.
Reaproveita diretamente `acessos_usuario_sistema.nivel_acesso` (Camada 1, sistema `servicos`):

| `nivel_acesso` | Papel no app | Pode |
|---|---|---|
| `usuario` | Solicitante | Criar solicitações, editar/ver as próprias enquanto `pendente` |
| `gestor` | Aprovador | Ver todas, aprovar/reprovar as `pendente` |
| `admin` | Financeiro | Tudo do aprovador + marcar `aprovado` como `pago` |

O mapeamento vive em `src/lib/AuthContext.jsx` (`mapAccessLevel`). Enquanto só existir o módulo
Financeiro, esse controle de acesso de sistema é suficiente. Quando um segundo módulo real for
implementado, revisitar e adotar o padrão de permissão granular por módulo que já existe na
intranet (`gestao_intranet.permissoes_usuario` + `canViewModule`).

### Backend

- Edge Function: `supabase/functions/servicos-api/index.ts` (renomeada de `pagamentos-api`)
  - Entidade única: `solicitacoes_pagamento`. Ações: `me`, `list`, `get`, `create`, `update`
    (só solicitante, só enquanto `pendente`), `set_status` (transição de estado, valida papel +
    estado atual), `signed_url` (URL assinada do comprovante).
  - Toda a autorização é feita em código na função (não há motor genérico de entidades como em
    `intranet-api`/`crm-api` — este app tem uma entidade só, não precisou do padrão `ENTITY_CONFIG`).
- Schema: `gestao_servicos` (renomeado de `gestao_pagamentos` na migration
  `20260720120000_rename_pagamentos_to_servicos.sql`; tabela original criada em
  `20260716090000_add_gestao_pagamentos_core.sql`)
  - Tabela: `solicitacoes_pagamento`
  - Helpers SQL: `public.servicos_access_level()`, `public.servicos_has_access()`,
    `public.servicos_is_aprovador()`, `public.servicos_is_financeiro()` — usados nas policies
    de RLS (defesa em profundidade; a função roda com `DATABASE_URL` direto e já valida em código).
  - Slug em `public.sistemas`: `servicos` (renomeado de `pagamentos` — o app nunca tinha ido para
    produção real, então o rename de slug/schema foi feito sem custo de migração de dados).
- Storage: bucket privado `comprovantes-pagamento` (5MB, mantém o nome original — ainda é o nome
  correto para comprovantes de pagamento dentro do módulo Financeiro). Upload é feito direto do
  client (`supabase.storage.from(financeiroApi.storage.bucket).upload(...)`), a function só gera
  signed URL.
- Notificação: ao aprovar/reprovar/pagar, a function insere em `gestao_ativos.fila_emails`
  (`tipo: 'aprovacao_pagamento'` ou `'pagamento_efetuado'`) — reaproveita a fila e o cron
  `processa-fila-email` já existentes, sem função nova.
- API client: `packages/api-client/src/financeiroApi.js` (renomeado de `pagamentosApi.js`,
  export `financeiroApi`).

### Convenções (Financeiro)

- Alçada de aprovação é única (um aprovador decide) — não há regra por faixa de valor ainda. Se
  isso mudar, revisar a máquina de estados e o `set_status` da edge function.

## Convenções (sistema Servicos)

- Novo módulo real ⇒ adicionar entrada em `src/lib/navigation.js` (tirar `comingSoon`), criar
  schema/tabelas próprias (pode reaproveitar `gestao_servicos` ou criar um schema novo se o
  domínio for muito distinto), e se o número de módulos ativos crescer, migrar o controle de
  acesso para o padrão de permissão granular por módulo da intranet.
- Sobreposição com `apps/rh`: o módulo "RH" aqui é só operacional (reembolsos/férias da equipe
  da oficina); RH corporativo completo continua sendo escopo do app `rh` (hoje placeholder) —
  não duplicar funcionalidade quando `rh` sair do placeholder.
