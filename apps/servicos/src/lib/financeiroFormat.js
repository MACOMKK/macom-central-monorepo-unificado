export const STATUS_VARIANT = {
  pendente: 'warning',
  aprovado: 'success',
  reprovado: 'destructive',
  pago: 'info',
  cancelado: 'secondary',
};

export const STATUS_LABEL = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

export const FORMA_PAGAMENTO_LABEL = {
  pix: 'Pix',
  boleto: 'Boleto',
  transferencia: 'Transferencia',
  cartao: 'Cartao',
  outros: 'Outros',
};

export const ANEXO_CATEGORIA_LABEL = {
  comprovante_solicitacao: 'Comprovante da solicitacao',
  nf_boleto: 'NF / Boleto',
  pdf_unificado: 'PDF unificado',
  rh: 'RH',
  comprovante_pagamento: 'Comprovante de pagamento',
};

export const ANEXO_CATEGORIA_OPCOES = Object.entries(ANEXO_CATEGORIA_LABEL).map(([value, label]) => ({ value, label }));

export const TIPOS_DOCUMENTO = [
  { value: 'orcamento', label: 'Orcamento' },
  { value: 'nota_fiscal', label: 'Nota fiscal' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'comprovante_pix', label: 'Comprovante Pix' },
  { value: 'outros', label: 'Outros' },
];

// Tipos de documento aceitos por categoria de anexo - mantem os dados consistentes
// para relatorios futuros por tipo de documento.
export const TIPOS_DOCUMENTO_POR_CATEGORIA = {
  comprovante_solicitacao: ['orcamento', 'recibo', 'comprovante_pix', 'outros'],
  nf_boleto: ['nota_fiscal', 'boleto'],
  pdf_unificado: ['outros'],
  rh: ['recibo', 'outros'],
  comprovante_pagamento: ['comprovante_pix', 'boleto', 'recibo', 'outros'],
};

export function getTiposDocumentoPorCategoria(categoria) {
  const permitidos = TIPOS_DOCUMENTO_POR_CATEGORIA[categoria];
  if (!permitidos) return TIPOS_DOCUMENTO;
  return TIPOS_DOCUMENTO.filter((item) => permitidos.includes(item.value));
}

export function formatValor(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

// Normaliza qualquer formato de data (Date, "YYYY-MM-DD" ou timestamp ISO) pra "YYYY-MM-DD",
// pra poder comparar/ordenar como string sem depender de timezone.
export function toDateOnly(data) {
  if (!data) return null;
  return String(data).slice(0, 10);
}

export function formatDataHora(data) {
  if (!data) return '-';
  return new Date(data).toLocaleString('pt-BR');
}

// Junta os campos exibidos nas colunas das telas de solicitacoes (titulo, fornecedor,
// categoria, forma de pagamento, vencimento, aprovador, solicitante, status, valor) num
// unico texto, pra pesquisa cobrir qualquer coluna sem precisar de um input por campo.
// Descricao fica de fora de proposito: ela nao aparece mais nas colunas, so no drawer.
export function buildSolicitacaoSearchText(row) {
  return [
    row.titulo,
    row.fornecedor,
    row.categoria,
    FORMA_PAGAMENTO_LABEL[row.forma_pagamento] || row.forma_pagamento,
    formatData(row.data_vencimento),
    row.solicitante_nome,
    row.aprovador_destino_nome,
    STATUS_LABEL[row.status] || row.status,
    formatValor(row.valor),
  ]
    .filter(Boolean)
    .join(' ');
}
