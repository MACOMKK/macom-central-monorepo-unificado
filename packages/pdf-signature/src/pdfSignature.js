import { PDFDocument } from 'pdf-lib';

// Baixa cada PDF (em ordem) e concatena todas as paginas num unico PDFDocument.
export async function mergePdfs(pdfUrls) {
  const pdfFinal = await PDFDocument.create();
  for (const url of pdfUrls) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao baixar "${url}".`);
    const bytes = await response.arrayBuffer();
    const pdfOrigem = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const paginas = await pdfFinal.copyPages(pdfOrigem, pdfOrigem.getPageIndices());
    paginas.forEach((pagina) => pdfFinal.addPage(pagina));
  }
  return pdfFinal;
}

// Baixa a imagem PNG da assinatura e a embute no PDF (ainda sem desenhar em nenhuma pagina).
export async function embedSignatureImage(pdfDoc, signatureUrl) {
  const response = await fetch(signatureUrl);
  if (!response.ok) throw new Error('Falha ao carregar assinatura.');
  const bytes = await response.arrayBuffer();
  return pdfDoc.embedPng(bytes);
}

// Desenha a imagem de assinatura ja embutida (embedSignatureImage) numa pagina do PDF, na posicao
// e tamanho informados como fracao da pagina (0..1). pdf-lib usa origem no canto inferior
// esquerdo, por isso a inversao do eixo Y.
export function stampSignature(pdfDoc, { pageIndex, xFrac, yFrac, widthFrac, heightFrac, signatureImage }) {
  const pagina = pdfDoc.getPages()[pageIndex];
  const pageWidthPt = pagina.getWidth();
  const pageHeightPt = pagina.getHeight();
  pagina.drawImage(signatureImage, {
    x: xFrac * pageWidthPt,
    y: pageHeightPt - (yFrac + heightFrac) * pageHeightPt,
    width: widthFrac * pageWidthPt,
    height: heightFrac * pageHeightPt,
  });
}

// Salva o PDF final e dispara o download no navegador.
export async function downloadPdf(pdfDoc, filename) {
  const pdfBytes = await pdfDoc.save();
  const blobUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}
