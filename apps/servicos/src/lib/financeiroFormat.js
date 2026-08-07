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

export const TIPOS_DOCUMENTO = [
  { value: 'orcamento', label: 'Orcamento' },
  { value: 'nota_fiscal', label: 'Nota fiscal' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'comprovante_pix', label: 'Comprovante Pix' },
  { value: 'outros', label: 'Outros' },
];

export function formatValor(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

export function formatDataHora(data) {
  if (!data) return '-';
  return new Date(data).toLocaleString('pt-BR');
}
