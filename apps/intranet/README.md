# Intranet

Monorepo do app `intranet` com frontend React/Vite em `apps/intranet` e backend via Supabase Edge Function em `supabase/functions/intranet-api`.

## Estrutura

- `apps/intranet`: aplicacao web
- `supabase/schema.sql`: schema e politicas RLS
- `supabase/functions/intranet-api`: funcao que centraliza o acesso aos dados da intranet

## Ambiente

Crie `apps/intranet/.env.local` com:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Para a funcao `intranet-api`, o Supabase precisa disponibilizar:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Ela usa o token do usuario recebido no header `Authorization` e consulta o schema `gestao_intranet` respeitando as regras de RLS.

## Rodando localmente

```bash
npm install
npm run dev
```

O comando da raiz sobe o workspace `intranet`.

## Build e lint

```bash
npm run build
npm run lint
```

## Supabase

O schema inicial esta em [supabase/schema.sql](./supabase/schema.sql).

Esse script cria:

- cadastro de usuarios em `public.colaboradores`, sincronizado com `auth.users`
- acesso por sistema em `public.acessos_usuario_sistema`
- permissoes por modulo em `gestao_intranet.permissoes_usuario`
- conteudo da intranet no schema `gestao_intranet`
- bucket `documents` para upload de arquivos
- politicas RLS iniciais

## Function intranet-api

A aplicacao web nao consulta mais as tabelas principais diretamente para CRUD e leitura de catalogos. Essas operacoes passam pela Edge Function `intranet-api`, que:

- le o usuario autenticado via Supabase Auth
- consulta o schema `gestao_intranet`
- monta os payloads consumidos pelo frontend
- preserva as regras de acesso do banco

## Permissionamento

O permissionamento da intranet possui duas camadas: acesso ao sistema e permissao por modulo.

### 1. Acesso ao sistema

Essa camada decide se o usuario pode entrar ou nao na intranet.

O login so e liberado quando todas as condicoes abaixo sao verdadeiras:

- o usuario esta autenticado no `auth.users`
- existe um colaborador correspondente em `public.colaboradores`
- o colaborador esta com `status = 'ativo'`
- existe uma linha em `public.acessos_usuario_sistema` para o sistema `slug = 'intranet'`
- essa linha de acesso esta com `ativo = true`

Se qualquer uma dessas regras falhar, a intranet bloqueia o acesso.

Fluxo pratico:

1. Se o usuario nao estiver vinculado a um colaborador, nao acessa.
2. Se o colaborador estiver `inativo`, nao acessa.
3. Se nao existir vinculacao em `acessos_usuario_sistema` para `intranet`, nao acessa.
4. Se a vinculacao existir, mas estiver bloqueada (`ativo = false`), nao acessa.
5. Se todas as validacoes acima passarem, o usuario entra na intranet.

### 2. Permissao por modulo

Depois que o usuario passou pela validacao de acesso ao sistema, a tabela `gestao_intranet.permissoes_usuario` define excecoes e ajustes finos do que ele pode fazer dentro da intranet.

Modulos controlados:

- `mod_avisos`
- `mod_links`
- `mod_colaboradores`
- `mod_documentos`
- `mod_calendario`
- `mod_conhecimento`
- `mod_feedback`

Cada modulo pode estar em um destes niveis:

- `none`: nao visualiza o modulo
- `view`: pode visualizar
- `edit`: pode visualizar e editar

Na ausencia de linha em `gestao_intranet.permissoes_usuario`, a intranet assume permissao padrao `view` para todos os modulos de usuarios com acesso ativo ao sistema.

### 3. Relacao entre `acessos_usuario_sistema` e `permissoes_usuario`

O acesso em `public.acessos_usuario_sistema` controla a entrada no sistema.

A tabela `gestao_intranet.permissoes_usuario` controla o comportamento do usuario dentro dos modulos, funcionando como camada de sobrescrita sobre a permissao padrao.

Isso significa:

- sem acesso ativo em `acessos_usuario_sistema`, o usuario nao entra
- com acesso ativo em `acessos_usuario_sistema`, o usuario entra
- se nao existir linha em `permissoes_usuario`, ele recebe `view` por padrao nos modulos
- se existir linha em `permissoes_usuario`, ela sobrescreve o comportamento modulo a modulo

### 4. Papel do `nivel_acesso`

O campo `nivel_acesso` em `public.acessos_usuario_sistema` nao substitui a tabela `permissoes_usuario`.

Hoje a regra e:

- `admin`: bypass das permissoes por modulo e acesso total na intranet
- `usuario`: entra normalmente, recebe `view` padrao nos modulos e pode ter esse comportamento ajustado por `gestao_intranet.permissoes_usuario`

Em outras palavras, para usuarios com nivel `usuario`, a tabela `permissoes_usuario` funciona como configuracao complementar de visualizacao e edicao dentro da intranet.

### 5. Sincronizacao automatica

O sistema mantem `gestao_intranet.permissoes_usuario` sincronizada com o acesso da intranet:

- quando um acesso ativo para `intranet` e criado ou reativado, a linha de `permissoes_usuario` pode ser criada automaticamente com todos os modulos em `view`, mas ela nao e obrigatoria para o login
- quando o acesso da `intranet` e bloqueado ou removido, a linha em `permissoes_usuario` e apagada
- se o colaborador estiver `inativo`, o login continua bloqueado, mesmo que ainda exista alguma linha antiga

### 6. Resumo operacional

- `public.colaboradores` define se o colaborador existe e se esta ativo
- `public.acessos_usuario_sistema` define se ele pode acessar a intranet
- `gestao_intranet.permissoes_usuario` ajusta o que ele pode fazer dentro da intranet, partindo de `view` padrao

Exemplo:

- colaborador ativo
- acesso ativo para `intranet`
- `mod_avisos = view`
- `mod_links = none`
- `mod_documentos = edit`

Resultado:

- o usuario entra na intranet
- pode visualizar Avisos
- nao pode visualizar Links
- pode visualizar e editar Documentos

## Proximo passo recomendado

Aplicar `supabase/schema.sql` no projeto Supabase e publicar a funcao `intranet-api` antes de validar o fluxo completo da aplicacao.
