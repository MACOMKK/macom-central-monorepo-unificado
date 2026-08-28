// Schemas Zod reaproveitados entre Edge Functions (item #14 do SECURITY_CHECKLIST_20.md).
// Fica em _shared (nao em packages/validation) porque as Edge Functions rodam em Deno e so
// resolvem imports locais dentro da arvore supabase/functions -- packages/* e consumido pelos
// apps front-end via npm workspaces/Vite, um resolvedor de modulos diferente.
import { z } from 'https://esm.sh/zod@3.23.8';

export { z };

// Body das 3 functions de seguranca de login (security-check-login-lock, security-log-failed-login,
// security-log-login-success): todas sao fail-open por design (nunca devem bloquear um login
// legitimo por erro/formato inesperado) -- o schema so formaliza a forma esperada do body; campos
// ausentes ou de tipo errado viram undefined em vez de rejeitar a requisicao.
export const loginTelemetryBodySchema = z
  .object({
    email: z.string().optional().catch(undefined),
    sistema_slug: z.string().optional().catch(undefined),
  })
  .catch({});

// Body de admin-create-user (action: create/delete/update_password/update_email/unlink_assignments).
// Campos usam .nullish() (aceita string, null ou undefined) porque varios sao selects opcionais no
// front que podem mandar null explicito ao limpar o campo -- o objetivo aqui e barrar tipos
// claramente errados (array, objeto, numero) na porta de entrada, nao remodelar a obrigatoriedade
// de campo por acao, que ja e tratada com mensagens especificas mais abaixo no handler.
export const adminCreateUserBodySchema = z.object({
  action: z.string().nullish(),
  id: z.string().nullish(),
  email: z.string().nullish(),
  password: z.string().nullish(),
  reset_password: z.boolean().nullish(),
  nome: z.string().nullish(),
  funcao: z.string().nullish(),
  cpf: z.string().nullish(),
  telefone: z.string().nullish(),
  departamento_id: z.string().nullish(),
  cargo_id: z.string().nullish(),
  cargo: z.string().nullish(),
  data_nascimento: z.string().nullish(),
  data_admissao: z.string().nullish(),
  status: z.string().nullish(),
  unidade_id: z.string().nullish(),
  empresa_id: z.string().nullish(),
});
