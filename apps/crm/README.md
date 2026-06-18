# MACOM BI (Supabase)
teste
Este projeto foi desacoplado do Base44 e agora usa Supabase para autenticação e banco.

## Setup local

1. Instale dependências:
   `npm install`
2. Crie o arquivo `.env.local` com base em `.env.example`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

3. No Supabase SQL Editor, rode o script:
   `supabase/schema.sql`
4. Inicie o projeto:
   `npm run dev`

## Convite de usuário com criação de senha

Para o fluxo de "primeiro acesso" com definição de senha, este projeto usa a Edge Function `invite-user`.

1. Deploy da função:
   `supabase functions deploy invite-user --no-verify-jwt`
2. No Dashboard do Supabase, em **Authentication > URL Configuration**, adicione a URL do app (ex: `http://localhost:5173`) em Redirect URLs.
3. O botão **Convidar Usuário** envia convite com redirecionamento para:
   `/set-password`

No primeiro acesso pelo link do email, o usuário define a senha e depois passa a logar por email/senha normalmente.

## Estrutura de dados

As tabelas principais usadas pela aplicação:

- `profiles`
- `units`
- `reports`
- `report_permissions`

## Observações

- Login é feito via `supabase.auth.signInWithPassword`.
- O botão "Convidar usuário" chama a Edge Function `invite-user` para enviar convite de primeiro acesso.
- As permissões iniciais em `supabase/schema.sql` são funcionais, mas você pode endurecer as regras RLS conforme sua política.
