// Feriados nacionais fixos + moveis (Sexta-feira Santa e Corpus Christi, calculados a partir da
// Pascoa pelo algoritmo de Gauss). Carnaval fica de fora por nao ser feriado nacional por lei.

function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function addDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

function formatarISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function feriadosNacionais(ano: number): Set<string> {
  const pascoa = calcularPascoa(ano);
  const sextaSanta = addDias(pascoa, -2);
  const corpusChristi = addDias(pascoa, 60);
  return new Set([
    `${ano}-01-01`,
    `${ano}-04-21`,
    `${ano}-05-01`,
    `${ano}-09-07`,
    `${ano}-10-12`,
    `${ano}-11-02`,
    `${ano}-11-15`,
    `${ano}-11-20`,
    `${ano}-12-25`,
    formatarISO(sextaSanta),
    formatarISO(corpusChristi),
  ]);
}

function parseDataLocal(dataISO: string): Date {
  const [ano, mes, dia] = dataISO.slice(0, 10).split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function ehDiaUtil(dataISO: string): boolean {
  const data = parseDataLocal(dataISO);
  const diaSemana = data.getDay();
  if (diaSemana === 0 || diaSemana === 6) return false;
  return !feriadosNacionais(data.getFullYear()).has(formatarISO(data));
}

export function proximaDataUtil(dataISO: string): string {
  let data = parseDataLocal(dataISO);
  while (true) {
    const diaSemana = data.getDay();
    const ehFeriado = feriadosNacionais(data.getFullYear()).has(formatarISO(data));
    if (diaSemana !== 0 && diaSemana !== 6 && !ehFeriado) {
      return formatarISO(data);
    }
    data = addDias(data, 1);
  }
}
