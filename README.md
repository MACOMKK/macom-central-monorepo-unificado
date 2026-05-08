# Gestao de Estoque TI

Projeto limpo para reiniciar a modelagem do Supabase do zero.

## O que foi mantido
- `supabase/config.toml` para uso da CLI
- `.env.local` e `.env.example` com as variaveis essenciais
- `src/lib/supabaseClient.js` com a conexao minima do client

## Rodar local
1. `npm install`
2. Configure o `.env.local`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

3. `npm run dev`

## Observacao
Toda a camada antiga ligada a tabelas, colunas, funcoes, uploads, filas e regras de negocio do Supabase foi removida para permitir uma nova estruturacao.
