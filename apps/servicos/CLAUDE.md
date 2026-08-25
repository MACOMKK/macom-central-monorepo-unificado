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

### Papéis (Camada 1 + Camada 2 por módulo)

Duas camadas, mesmo padrão que a intranet usa (`gestao_intranet.permissoes_usuario` +
`canViewModule`), adaptado pra papéis de aprovação em vez de `view/edit`:

- **Camada 1 — acesso ao sistema**: `public.acessos_usuario_sistema.nivel_acesso` (sistema
  `servicos`), concedida na console `admin` (`SystemAccessManagement.jsx`). Responde só "essa
  pessoa pode entrar no Servicos?". `nivel_acesso = 'admin'` bypassa a Camada 2 em todo módulo
  (super-admin do sistema).
- **Camada 2 — papel por módulo**: `gestao_servicos.permissoes_modulo` — tabela normalizada
  (`colaborador_id, modulo, papel`, unique por par), gerenciada dentro do próprio app em
  `/permissoes` (`src/pages/Permissoes.jsx`, visível só pra quem é `admin` na Camada 1). Modelo
  normalizado (não uma coluna `mod_<modulo>` por módulo, como na primeira versão em
  `20260805120000_add_gestao_servicos_permissoes_usuario.sql`) justamente pra módulo novo não
  exigir migration — só inserir linhas com o `modulo` novo. Migration de normalização:
  `20260805130000_normalize_gestao_servicos_permissoes_usuario.sql`.
  - Os valores válidos de `papel` **não são um enum global único** — cada módulo declara seu
    próprio conjunto, porque nem todo módulo futuro vai precisar da mesma hierarquia de
    aprovação do Financeiro. Hoje só o Financeiro existe: `usuario | aprovador | financeiro |
    nenhum` — nomes específicos do domínio (não os genéricos `gestor`/`admin` da Camada 1),
    renomeados na migration `20260806100000_rename_servicos_financeiro_papeis.sql` (antes disso
    o módulo usava `gestor`/`admin`, o que gerava confusão com o `nivel_acesso` da Camada 1 e já
    não batia com o nome das funções SQL `servicos_is_aprovador`/`servicos_is_financeiro`, que
    desde sempre se chamavam assim). Auto-provisionado com `usuario` quando alguém ganha Camada
    1, via trigger `auto_create_servicos_permissoes`, pra ninguém ficar sem papel. Registro em dois lugares
    que precisam ficar em sincronia: `SERVICOS_MODULOS_CONFIG` (backend,
    `supabase/functions/servicos-api/index.ts`, valida `papel` por módulo em `set_permissao`) e
    `MODULOS_PERMISSAO` (frontend, `src/lib/modulosPermissao.js`, cada entrada ativa tem seu
    array `papeis`, controla o Select da tela de Permissões). Módulo novo com o mesmo tipo de
    hierarquia = só adicionar a chave nos dois lugares reaproveitando o array de papéis
    existente. Módulo novo com papéis diferentes = adicionar a chave com seu próprio array nos
    dois lugares e alargar o `check` de `gestao_servicos.permissoes_modulo.papel` via migration
    (o `CHECK` no banco é defesa em profundidade — a validação por módulo já acontece na edge
    function, mas o `CHECK` evita que alguém com acesso direto à tabela grave um papel fora do
    conjunto conhecido).

| Papel no módulo Financeiro | Pode |
|---|---|
| `usuario` | Criar solicitações, editar/ver as próprias enquanto `pendente` |
| `aprovador` | Ver e aprovar/reprovar só as solicitações endereçadas a ele (`aprovador_destino_id`), além das próprias como solicitante |
| `financeiro` | Ve/acessa todas as solicitações (não só as endereçadas a ele) + tudo do aprovador + marcar `aprovado` como `pago` |
| `nenhum` | Sem acesso ao módulo (mas continua com Camada 1 ativa, pra outros módulos) |

**Aprovador é por solicitação, não por papel** (migration
`20260806110000_scope_servicos_aprovador_destino.sql`): toda solicitação tem um
`aprovador_destino_id` obrigatório, escolhido pelo solicitante na criação (select "Aprovador
responsável" em `NovaSolicitacaoDrawer.jsx`, populado pela action `list_aprovadores` — lista
colaboradores com papel `aprovador`/`financeiro` no Financeiro, ou `nivel_acesso = 'admin'` na
Camada 1). Um `aprovador` só vê/acessa/decide sobre a solicitação que foi endereçada a ele — não
qualquer solicitação `pendente` de qualquer colaborador. `financeiro` continua vendo e podendo
agir sobre todas, como sobreposição (é o papel "acima" do fluxo). Essa checagem é centralizada em
`canAccessSolicitacao()` (edge function) e na função SQL
`public.servicos_can_access_solicitacao()` (RLS, defesa em profundidade).

O papel efetivo (Camada 1 admin bypassando, senão lido da Camada 2) é calculado em
`getServicosModuleRole` (`supabase/functions/servicos-api/index.ts`) e nos helpers SQL
`servicos_module_role`/`servicos_is_aprovador`/`servicos_is_financeiro` (usados nas RLS policies).
O front consome esse valor direto (sem remapeamento) em `src/lib/AuthContext.jsx`
(`normalizeServicosUser`), a partir do campo `role` retornado por `financeiroApi.auth.me`.

Um colaborador só precisa aparecer na Camada 2 nos módulos que usa — alguém pode ser `aprovador` no
Financeiro sem ter nenhum papel definido em Oficina/Estoque quando esses módulos ganharem telas
reais (só adicionar coluna `mod_<novo>` na tabela, seguindo o mesmo padrão).

### Backend

- Edge Function: `supabase/functions/servicos-api/index.ts` (renomeada de `pagamentos-api`)
  - Entidade principal: `solicitacoes_pagamento`. Ações: `me`, `list`, `get`, `create`, `update`
    (só solicitante, só enquanto `pendente`; `create`/`update` exigem `aprovador_destino_id`
    válido, validado em `validateAprovadorDestino()`), `set_status` (transição de estado, valida
    papel + estado atual + se é o `aprovador_destino_id` da solicitação ou financeiro),
    `signed_url` (URL assinada do comprovante), `list_empresas` (catálogo `public.empresas` pro
    seletor da tela de nova solicitação — a tabela **não tem** coluna `ativo`/`slug`, foram
    dropadas em `20260709120000_simplify_empresas_link_unidades.sql`; lista todas as linhas, sem
    filtro), `list_aprovadores` (colaboradores elegíveis a `aprovador_destino_id` — papel
    `aprovador`/`financeiro` no módulo ou `nivel_acesso = 'admin'` na Camada 1; usada pelo select
    de nova solicitação, disponível pra qualquer usuário com acesso ao módulo, não só admin).
  - Anexos multi-arquivo: `list_anexos`, `registrar_anexo`, `remover_anexo` (tabela
    `anexos_solicitacao`, categorias `comprovante_solicitacao | nf_boleto | pdf_unificado | rh |
    comprovante_pagamento`; upload é feito direto do client pro Storage, a function só registra
    metadados e gera signed URL).
  - Parcelamento: `list_parcelas`, `criar_parcelas` (só financeiro, solicitação precisa estar
    `aprovado`; substitui o plano de parcelas existente se nenhuma ainda foi paga),
    `registrar_pagamento_parcela` (só financeiro, marca uma parcela como `pago` — quando a
    última parcela de uma solicitação é paga, o trigger `trg_servicos_parcelas_rollup` marca a
    própria solicitação como `pago` automaticamente).
  - Histórico: ação `historico` lê `historico_solicitacao` (timeline de eventos: `criada`,
    `aprovada`, `reprovada`, `parcela_criada`, `parcela_paga`, `pago`) — gravado pela própria
    function via `insertHistorico()` a cada transição, sem precisar de trigger.
  - Fornecedores (`gestao_servicos.fornecedores`): cadastro exclusivo do papel `financeiro`
    (checado via `isFinanceiro(moduleRole)`, que já cobre admin da Camada 1 — `getServicosModuleRole`
    retorna `'financeiro'` pra admin). Tela dedicada `/fornecedores` (`src/pages/Fornecedores.jsx`,
    só no menu pra `isFinanceiro`), ações `list_fornecedores_admin` (todos, com `ativo`),
    `criar_fornecedor` e `atualizar_fornecedor`. `list_fornecedores`
    (usada no select do `NovaSolicitacaoDrawer.jsx`, disponível a qualquer solicitante) só retorna
    `ativo = true`. Fornecedor é inativado, nunca apagado — `solicitacoes_pagamento.fornecedor_id`
    referencia a linha e `fornecedor` já é snapshot do nome, então inativar não quebra histórico.
    Antes disso o cadastro era feito inline no próprio drawer por qualquer solicitante
    (`criar_fornecedor` sem checagem de papel); migrado pra tela própria em
    `20260806120000_add_servicos_fornecedores_gestao.sql` (colunas `ativo`/`atualizado_em`).
    Cadastro expandido em `20260824140000_expand_servicos_fornecedores.sql` com campos fiscais
    (`tipo_pessoa`, `documento` — único quando preenchido, `inscricao_estadual`), contato
    (`email`, `telefone`) e endereço (`endereco`, `cidade`, `uf`, `cep`) — todos nullable,
    normalizados em `extrairDadosFornecedor()` na edge function (documento sem pontuação, campos
    vazios viram `null`). Dados bancários (banco/agência/conta/PIX) ficaram fora de escopo —
    o Financeiro decidiu não guardar essa informação no cadastro de fornecedor. A tela trocou os
    inputs inline por um `Dialog` de cadastro/edição
    (`src/pages/Fornecedores.jsx`) com todos os campos; a tabela continua enxuta (nome,
    documento, status). `list_fornecedores` (catálogo do drawer de nova solicitação) não mudou —
    continua só `id, nome`.
  - Categorias (`gestao_servicos.categorias`): mesmo padrão de fornecedores (cadastro exclusivo
    do papel `financeiro`, tela dedicada `/categorias` — `src/pages/Categorias.jsx`, ações
    `list_categorias_admin`/`criar_categoria`/`atualizar_categoria`, `list_categorias` só ativas
    pro select do `NovaSolicitacaoDrawer.jsx`), substituindo o enum fixo antigo (`fornecedor |
    servico | viagem | reembolso | outros`, hardcoded em `CATEGORIAS` na function e no drawer).
    `solicitacoes_pagamento.categoria_id` referencia a linha; `categoria` (texto) continua como
    snapshot do nome no momento da solicitação, mesmo padrão de `fornecedor`/`fornecedor_id` —
    o antigo `CHECK` de enum na coluna foi removido (migration
    `20260806130000_add_servicos_categorias.sql`), já que o valor agora vem de um catálogo aberto,
    não mais uma lista fixa no código.
  - Toda a autorização é feita em código na função (não há motor genérico de entidades como em
    `intranet-api`/`crm-api` — este app tem uma entidade principal, não precisou do padrão
    `ENTITY_CONFIG`).
- Schema: `gestao_servicos` (renomeado de `gestao_pagamentos` na migration
  `20260720120000_rename_pagamentos_to_servicos.sql`; tabela original criada em
  `20260716090000_add_gestao_pagamentos_core.sql`)
  - Tabelas: `solicitacoes_pagamento` (ganhou `numero`, `titulo`, `empresa_id`,
    `departamento_id`, `observacao`, `aprovador_destino_id` na migration
    `20260805150000_add_servicos_financeiro_parcelamento_anexos.sql` — parte da migração do
    antigo fluxo em AppSheet; `aprovador_destino_id` só passou a ser exigido e aplicado em regra
    de acesso na migration `20260806110000_scope_servicos_aprovador_destino.sql`, ver seção
    "Papéis" acima), `anexos_solicitacao`, `parcelas_pagamento`,
    `historico_solicitacao` (todas novas na mesma migration `20260805150000`).
  - `empresa_id`/`departamento_id` são **snapshot no momento da criação** (copiados de
    `colaboradores.empresa_id`/`departamento_id` do solicitante na própria function, se não
    vierem no payload), não um join ao vivo — preserva o setor/empresa corretos historicamente
    mesmo que o colaborador mude de área depois.
  - `parcelas_pagamento`/`anexos_solicitacao`/`historico_solicitacao` seguem o padrão de tabela
    filha 1:N já usado em `gestao_comunicacao.anexos_mensagem`. "Tipo pagamento" (à vista/
    parcelado) e "status pagamento" (pendente/parcial/pago) **não são colunas** — são derivados
    agregando `parcelas_pagamento` na query da tela, pra não ter campo manual desincronizado.
  - Helpers SQL: `public.servicos_access_level()`, `public.servicos_has_access()`,
    `public.servicos_is_aprovador()`, `public.servicos_is_financeiro()`,
    `public.servicos_can_access_solicitacao(solicitante_id, aprovador_destino_id)` (esse último
    combina os dois: financeiro sempre pode, senão só o solicitante ou o aprovador designado da
    linha — usado nas policies de select/update de `solicitacoes_pagamento` e nas policies das
    tabelas filhas) — usados nas policies de RLS (defesa em profundidade; a função roda com
    `DATABASE_URL` direto e já valida em código).
  - Slug em `public.sistemas`: `servicos` (renomeado de `pagamentos` — o app nunca tinha ido para
    produção real, então o rename de slug/schema foi feito sem custo de migração de dados).
- Storage: bucket privado `comprovantes-pagamento` (5MB por arquivo, PDF/imagem — validado tanto
  em código quanto no próprio bucket via `allowed_mime_types`/`file_size_limit`). Upload é feito
  direto do client (`supabase.storage.from(financeiroApi.storage.bucket).upload(...)`), a
  function só registra o anexo e gera signed URL. Path organizado por
  `<solicitacao_id>/<categoria>/<uuid>.<ext>`.
- Notificação: ao aprovar/reprovar/pagar, a function insere em `gestao_ativos.fila_emails`
  (`tipo: 'aprovacao_pagamento'` ou `'pagamento_efetuado'`) — reaproveita a fila e o cron
  `processa-fila-email` já existentes, sem função nova.
- API client: `packages/api-client/src/financeiroApi.js` (renomeado de `pagamentosApi.js`,
  export `financeiroApi`), agora com os namespaces `anexos`, `parcelas`, `historico` e
  `empresas` além de `solicitacoes`/`permissoes`/`auth`.

### Convenções (Financeiro)

- Alçada de aprovação é única (um aprovador decide, e é sempre o mesmo indivíduo escolhido na
  criação — não "qualquer aprovador do módulo") — a antiga coluna "APROVADO GESTOR SETOR" da
  planilha AppSheet legada era redundante e não entrou no modelo novo; não há segunda etapa de
  aprovação (diretoria) nem regra por faixa de valor ainda. Se isso mudar (ex.: aprovação por
  faixa de valor, múltiplos aprovadores em paralelo), revisar a máquina de estados, o `set_status`
  da edge function e `servicos_can_access_solicitacao()`.
- Migração do AppSheet: o desenho completo (mapeamento das ~53 colunas da planilha legada pro
  modelo atual) está registrado em `20260805150000_add_servicos_financeiro_parcelamento_anexos.sql`
  e no histórico do plano que originou essa migration — importação de dados históricos do
  AppSheet continua fora de escopo.

## Convenções (sistema Servicos)

- Novo módulo real ⇒ adicionar entrada em `src/lib/navigation.js` (tirar `comingSoon`), criar
  schema/tabelas próprias (pode reaproveitar `gestao_servicos` ou criar um schema novo se o
  domínio for muito distinto), e registrar o módulo na Camada 2 de permissão (ver seção
  "Papéis" acima) com o conjunto de `papeis` que fizer sentido pro fluxo dele — não precisa
  reaproveitar a hierarquia de aprovação do Financeiro nem migrar pro padrão `view/edit` da
  intranet, o modelo atual já suporta um vocabulário de papéis por módulo.
- Sobreposição com `apps/rh`: o módulo "RH" aqui é só operacional (reembolsos/férias da equipe
  da oficina); RH corporativo completo continua sendo escopo do app `rh` (hoje placeholder) —
  não duplicar funcionalidade quando `rh` sair do placeholder.

## Shell mobile (Capacitor/Android)

Este é o único app do monorepo empacotado como app nativo hoje — os demais continuam só web.
Capacitor embrulha o mesmo build web (`vite build` → `dist/`) num shell Android; não é um
front-end separado, então qualquer mudança em `src/` já vale pra web e pro app automaticamente
(só precisa rodar `cap sync` de novo antes de gerar um APK novo).

- **Config**: `capacitor.config.ts` (`appId: br.com.macom.servicos` — placeholder até
  confirmar o domínio oficial da MACOM; é definitivo assim que publicado na Play Store, ajustar
  **antes** do primeiro build assinado). `webDir: dist`.
- **Projeto nativo**: `android/` (gerado por `npx cap add android`, é um projeto Gradle
  completo — fica versionado; só build output/config de máquina é ignorado, ver `.gitignore`
  raiz).
- **Ícone/splash**: `resources/icon.png` (1024×1024) e `resources/splash.png` (2732×2732) são o
  source, compostos a partir do logo atual sobre fundo na cor da marca — placeholder funcional
  pra testar, mas antes de publicar de verdade vale substituir por uma arte quadrada desenhada
  pra isso (o logo é retangular, o resultado gerado fica ok mas não é ideal). Pra regerar todas
  as resoluções depois de trocar o source: `npx @capacitor/assets generate --android`.
  A splash nativa (`AppTheme.NoActionBarLaunch` em `android/app/src/main/res/values/styles.xml`)
  **não usa** o `@drawable/splash` gerado — foi trocada pra um fundo sólido
  (`@color/splash_background`, `#F5F5F5`, mesmo `bg-background` do `BrandLoader` em
  `packages/ui/src/spinner.jsx`), pra a splash do Android virar só uma transição neutra em vez de
  mostrar o logo estático antes do `BrandLoader` (loading animado) entrar. Rodar
  `npx @capacitor/assets generate --android` de novo reescreve o `@drawable/splash` mas não deve
  mexer nessa linha do `styles.xml`; se mexer, reaplicar a troca pro `@color/splash_background`.
- **Botão voltar do Android**: `src/components/NativeBackButtonHandler.jsx`, montado dentro do
  `<Router>` em `App.jsx`. Sem isso o botão físico/gesto fecha o app inteiro em vez de navegar
  pra trás — só ativa via `Capacitor.isNativePlatform()`, não afeta a versão web.
- **Auth**: é email/senha (`supabase.auth.signInWithPassword`), sem fluxo OAuth/magic-link por
  redirect de URL — por isso não precisou de tratamento especial pro `detectSessionInUrl` do
  supabase-js dentro da WebView. Sessão persiste em `localStorage` normalmente. Se um dia entrar
  login social/magic-link, aí sim vai precisar de `@capacitor/browser` + listener de deep link
  (`App.addListener('appUrlOpen', ...)`).
- **Fluxo de build/teste** (exige Android Studio + SDK instalados localmente — não roda numa
  sessão de agente): `npm run android:servicos` na raiz builda o web, roda `cap sync` e abre o
  Android Studio; ou direto por linha de comando, `cd apps/servicos/android && gradlew
  assembleDebug` gera o APK debug em `android/app/build/outputs/apk/debug/app-debug.apk`.
- **iOS**: ainda não configurado (decisão consciente — só Android por enquanto). Pra adicionar
  depois: `npx cap add ios` dentro de `apps/servicos` (exige Mac + Xcode pra buildar), reaproveita
  o mesmo `capacitor.config.ts`/`resources/`.
