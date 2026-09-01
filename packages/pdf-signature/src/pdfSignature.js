import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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
// Se signerName for informado, tambem grava um carimbo de texto logo abaixo da imagem
// ("Assinado eletronicamente por Fulano em dd/mm/aaaa hh:mm") -- a assinatura sozinha (so a
// imagem do traco) nao prova nada se o PDF circular fora da plataforma; o carimbo de texto e o
// unico dado de autoria/data que fica embutido no proprio arquivo (o resto do rastro vive so no
// banco, em assinaturas_anexo).
export async function stampSignature(
  pdfDoc,
  { pageIndex, xFrac, yFrac, widthFrac, heightFrac, signatureImage, signerName, signedAt, empresaNome },
) {
  const pagina = pdfDoc.getPages()[pageIndex];
  const pageWidthPt = pagina.getWidth();
  const pageHeightPt = pagina.getHeight();
  const x = xFrac * pageWidthPt;
  const width = widthFrac * pageWidthPt;
  const height = heightFrac * pageHeightPt;
  const y = pageHeightPt - (yFrac + heightFrac) * pageHeightPt;

  pagina.drawImage(signatureImage, { x, y, width, height });

  if (signerName) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    // Piso de 7pt (nao 5pt) e cinza escuro (nao cinza claro): com a caixa de assinatura pequena
    // o calculo anterior (width / 26) caia perto do minimo e ficava praticamente ilegivel --
    // motivo do usuario relatar que "o carimbo nao aparece" mesmo estando de fato gravado no PDF.
    const fontSize = Math.max(7, Math.min(8, width / 20));
    const dataHora = new Date(signedAt || Date.now()).toLocaleString('pt-BR');
    const linhas = [`Assinado eletronicamente por ${signerName}`, `em ${dataHora} - ${empresaNome || 'MACOM'}`];
    linhas.forEach((linha, indice) => {
      pagina.drawText(linha, {
        x,
        // Math.max 0: se a assinatura for posicionada perto do rodape da pagina, o texto abaixo
        // dela nao pode ir pra fora da area visivel (coordenada negativa nao desenha nada).
        y: Math.max(0, y - fontSize * (indice + 1) - 2 * (indice + 1)),
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
    });
  }
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
