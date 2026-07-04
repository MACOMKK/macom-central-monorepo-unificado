# CRM (REVVO CRM) — app-specific

> Este arquivo complementa o CLAUDE.md raiz do monorepo. Só documenta o que é específico deste app.

## Domínio

Gestão comercial automotiva: leads, clientes, atendimentos e distribuição para vendedores.

## Estrutura

- `src/api/` — clients de API (chama `crm-api`)
- `src/context/` — `AuthContext`, `EmpresaContext`
- `src/hooks/useCrmRealtime.js` — assinatura Supabase Realtime
- `src/components/leads/`, `src/components/eventos/` — componentes por domínio
- `src/pages/` — telas

## Backend

- Edge Function: `supabase/functions/crm-api/index.ts`
  - CRUD genérico (`get`/`list`/`create`/`update`/`delete`) sobre as entidades abaixo
  - Actions específicas: `me`, `list_responsaveis`, `get_distribution_config`, `save_distribution_config`, `clear_crm_test_data`
- Schema: `gestao_crm` (migrations em `supabase/migrations/*gestao_crm*`)

### Entidades principais

| Tabela | Campos-chave |
|---|---|
| `clientes` | `status_relacionamento` (lead/cliente/pos_venda) |
| `leads` | `origem` (telefone/whatsapp/site/showroom/indicacao), `status` (novo/em_atendimento/convertido/perdido), SLA, responsável |
| `atendimentos` | `tipo` (venda/pos_venda/agendamento/retorno), `temperatura` (frio/morno/quente) |
| `historico_atendimentos` | auditoria de mudanças |
| `veiculos_interesse` | veículos associados a um lead |
| `configuracoes_distribuicao` / `vendedores_distribuicao` | regras de distribuição automática de leads |

## Realtime

`useCrmRealtime.js` escuta INSERT/UPDATE/DELETE em `gestao_crm` (leads, clientes, atendimentos,
historico_atendimentos, veiculos_interesse, configuracoes_distribuicao, vendedores_distribuicao)
e sincroniza o cache do React Query. Estados possíveis: `connecting`, `active`, `syncing`, `error`, `disabled`.
Ao adicionar uma nova tabela ao schema `gestao_crm` que precise refletir em tempo real na UI,
lembrar de registrá-la aqui também.

## Stripe

Não há integração Stripe implementada neste app hoje (apenas dependência declarada em `package.json`,
sem uso no código). Se for adicionada, documentar aqui o fluxo (webhooks, edge function envolvida, etc).

## Convenções

- Toda entidade nova deve passar pelo padrão CRUD genérico da `crm-api`, evitando endpoints ad-hoc.
- Alterações de schema em `gestao_crm` devem considerar o impacto no Realtime (ver seção acima).
