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

// Solicitacao com plano de parcelas onde algumas ja foram pagas mas nao todas -- status da
// solicitacao continua 'aprovado' ate a ultima parcela ser quitada (so ai vira 'pago').
export function isParcialmentePago(row) {
  const total = Number(row.parcelas_total || 0);
  const pagas = Number(row.parcelas_pagas || 0);
  return total > 0 && pagas > 0 && pagas < total;
}

export function formatValor(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Usa pra timestamps de verdade (criado_em, analisado_em etc.) onde a hora importa -- o
// New Date(...) + toLocaleDateString ja converte corretamente pro fuso do navegador nesse caso.
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

// Igual toDateOnly, mas devolve so o prefixo "YYYY-MM-DD" (via regex, sem passar por
// `new Date(...)`) quando `data` for string, e usa os getters locais quando for um objeto Date
// de verdade (ex. `new Date()` representando "agora"). Precisa ser assim porque colunas `date`
// puras (sem hora, ex. data_vencimento) chegam do backend como string -- e podem vir tanto
// "YYYY-MM-DD" quanto serializadas como timestamp UTC ("2026-08-14T00:00:00.000Z", se o driver
// SQL devolver um objeto Date que o JSON.stringify converte via toISOString). Passar essa string
// por `new Date(...)` reintroduz o bug: ECMA-262 trata string ISO so-de-data como meia-noite
// UTC, e em fuso negativo (Brasil, UTC-3) isso vira o dia anterior ao converter pro fuso local.
// Como a data literal (dia certo) ja esta nos 10 primeiros caracteres da string em qualquer um
// dos formatos, extrair direto por regex e a unica forma de nao introduzir esse offset.
export function toLocalDateOnly(data) {
  if (!data) return null;
  if (data instanceof Date) {
    if (Number.isNaN(data.getTime())) return null;
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }
  const match = String(data).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[0] : null;
}

// Formata um campo que e conceitualmente so uma data de calendario (ex. data_vencimento,
// coluna `date` sem hora) sem passar pelo mesmo bug de formatData: nao usa `new Date(...)`,
// so reformata o prefixo "YYYY-MM-DD" (independente de vir puro ou como timestamp UTC) pra
// "DD/MM/YYYY" via string, sem nenhuma conversao de fuso -- ver comentario de toLocalDateOnly.
export function formatDataVencimento(data) {
  const iso = toLocalDateOnly(data);
  if (!iso) return '-';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Classifica o vencimento pra dar destaque visual (Badge) nas listagens/cards -- movido pra ca
// (era local a Pagamentos.jsx) pra Aprovacoes/SolicitacaoCard tambem poderem usar.
export function getVencimentoInfo(dataVencimento) {
  // toLocalDateOnly (nao toDateOnly): precisa bater com o dia que formatData mostra na tela,
  // que interpreta a data no fuso local do navegador -- se data_vencimento vier como timestamp
  // UTC (ex. "2026-08-14T00:00:00.000Z"), fatiar a string crua e comparar com um "hoje" tambem
  // em fuso local pode divergir em um dia perto da meia-noite.
  const dia = toLocalDateOnly(dataVencimento);
  if (!dia) return { key: 'sem_vencimento', label: 'Sem vencimento', variant: 'outline' };

  const agora = new Date();
  const hoje = toLocalDateOnly(agora);
  const amanhaDate = new Date(agora);
  amanhaDate.setDate(amanhaDate.getDate() + 1);
  const amanha = toLocalDateOnly(amanhaDate);

  if (dia < hoje) return { key: 'vencido', label: 'Vencido', variant: 'destructive' };
  if (dia === hoje) return { key: 'vence_hoje', label: 'Vence hoje', variant: 'warning' };
  if (dia === amanha) return { key: 'vence_amanha', label: 'Vence amanhã', variant: 'info' };
  return { key: 'no_prazo', label: 'No prazo', variant: 'success' };
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
    row.numero,
    row.titulo,
    row.fornecedor,
    row.categoria,
    FORMA_PAGAMENTO_LABEL[row.forma_pagamento] || row.forma_pagamento,
    formatDataVencimento(row.vencimento_efetivo),
    row.solicitante_nome,
    row.aprovador_destino_nome,
    STATUS_LABEL[row.status] || row.status,
    formatValor(row.valor),
  ]
    .filter(Boolean)
    .join(' ');
}
