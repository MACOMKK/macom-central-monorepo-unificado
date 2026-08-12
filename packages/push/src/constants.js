// Chave publica VAPID -- e publica por design (vai no bundle do front sem problema), a privada
// fica so no Supabase (secret VAPID_PRIVATE_KEY, usada em supabase/functions/_shared/push.ts).
// Se um dia rotacionar as chaves, atualizar aqui E no secret do Supabase juntos.
export const VAPID_PUBLIC_KEY =
  'BPRCHIcQ95Afyr06-uCO5FHF6nmZJ0_iovNKFpCOkDYooQLv4wTbZAo9D_aQARknNRhrTjpPc89KSxn5mNDvxfU';

export const PUSH_SW_URL = '/push-sw.js';
