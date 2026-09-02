export function mapMustChangePassword(row: Record<string, unknown> | null | undefined) {
  return Boolean(row?.precisa_trocar_senha);
}

export const CLEAR_MUST_CHANGE_PASSWORD_SQL =
  'update public.colaboradores set precisa_trocar_senha = false, atualizado_em = now() where id = $1;';
