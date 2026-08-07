import { financeiroApi } from '@macom/api-client/financeiroApi';
import { supabase } from '@macom/api-client/supabaseClient';

export const MAX_ANEXO_SIZE = 5 * 1024 * 1024;

export const ALLOWED_ANEXO_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function isAllowedAnexoMimeType(file) {
  return ALLOWED_ANEXO_MIME_TYPES.includes(file.type);
}

export async function uploadAnexo({ file, solicitacaoId, categoria, tipoDocumento = 'outros', parcelaId = null }) {
  const extension = file.name.split('.').pop();
  const path = `${solicitacaoId}/${categoria}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(financeiroApi.storage.bucket)
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  return financeiroApi.anexos.registrar({
    solicitacaoId,
    parcelaId,
    categoria,
    tipoDocumento,
    nomeArquivo: file.name,
    tipoMime: file.type || 'application/octet-stream',
    tamanhoBytes: file.size,
    storagePath: path,
  });
}
