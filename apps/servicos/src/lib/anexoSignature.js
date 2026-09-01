import { PDFDocument } from 'pdf-lib';
import { embedSignatureImage, stampSignature } from '@macom/pdf-signature';
import { financeiroApi } from '@macom/api-client/financeiroApi';
import { supabase } from '@macom/api-client/supabaseClient';

// Assina um anexo individual (nao o "PDF unico" mesclado) e substitui o arquivo original pela
// versao carimbada: mesmo padrao de path de uploadAnexo (anexoUpload.js), so que sobrescrevendo
// a linha do anexo via financeiroApi.anexos.assinar em vez de criar um novo registro.
export async function signAnexo({ anexo, signatureUrl, posicao }) {
  const response = await fetch(anexo.url);
  if (!response.ok) throw new Error(`Falha ao baixar "${anexo.nome_arquivo}".`);
  const bytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const signatureImage = await embedSignatureImage(pdfDoc, signatureUrl);
  stampSignature(pdfDoc, { ...posicao, signatureImage });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const path = `${anexo.solicitacao_id}/${anexo.categoria}/${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(financeiroApi.storage.bucket)
    .upload(path, blob, { upsert: false, contentType: 'application/pdf' });
  if (uploadError) throw uploadError;

  return financeiroApi.anexos.assinar({
    id: anexo.id,
    storagePath: path,
    nomeArquivo: anexo.nome_arquivo,
    tamanhoBytes: blob.size,
    posicao,
  });
}
