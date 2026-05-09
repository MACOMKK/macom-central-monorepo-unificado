import { catalogApi } from '@/lib/catalogApi';

export async function importInfrastructureRows({
  rowsToImport,
  unitOptions,
  normalizeText,
  resolveIdByName,
}) {
  const created = [];
  const errors = [];

  for (let index = 0; index < rowsToImport.length; index += 1) {
    const row = rowsToImport[index];

    try {
      const unidadeNome = normalizeText(row.unidade || row.unidade_filial || row.unidade_nome);
      const unidadeId = unidadeNome ? resolveIdByName(unidadeNome, unitOptions) : null;

      if (unidadeNome && !unidadeId) {
        throw new Error(`Unidade nao encontrada: ${row.unidade || row.unidade_filial || row.unidade_nome}`);
      }

      const payload = {
        tipo: row.tipo || null,
        nome: row.nome || row.titulo_nome || row.titulo || null,
        valor_identificador: row.valor_identificador || row.valor || row.endereco_ip || row.url_do_sistema || null,
        descricao: row.descricao || row.observacao || null,
        unidade_id: unidadeId || null,
      };

      if (!payload.tipo) throw new Error('Tipo obrigatorio.');
      if (!payload.nome) throw new Error('Titulo / Nome obrigatorio.');
      if (!payload.valor_identificador) throw new Error('Valor / Identificador obrigatorio.');
      if (!payload.unidade_id) throw new Error('Unidade obrigatoria.');

      const createdRow = await catalogApi.infra_estrutura.create(payload);
      created.push(createdRow);
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error.message || 'Falha ao importar.'}`);
    }
  }

  return { created, errors };
}
