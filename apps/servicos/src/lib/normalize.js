// Normaliza texto pra busca: minusculo e sem acento, pra "solicitacao" achar "Solicitação".
export function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
