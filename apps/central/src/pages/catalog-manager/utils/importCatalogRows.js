export async function importAssetRows({
  collaborators,
  createAsset,
  normalizeText,
  resolveIdByName,
  rowsToImport,
  units,
}) {
  const unitOptions = units.map((unit) => ({ id: unit.id, normalized: normalizeText(unit.nome) }));
  const collaboratorEmailOptions = collaborators
    .filter((item) => item.email)
    .map((item) => ({ id: item.id, normalized: normalizeText(item.email) }));
  const collaboratorNameOptions = collaborators
    .filter((item) => item.nome)
    .map((item) => ({ id: item.id, normalized: normalizeText(item.nome) }));

  const created = [];
  const errors = [];

  for (let index = 0; index < rowsToImport.length; index += 1) {
    const row = rowsToImport[index];

    try {
      const unitName = normalizeText(row.unidade || row.unidade_nome);
      const collaboratorEmail = normalizeText(row.responsavel_email);
      const collaboratorName = normalizeText(row.responsavel_nome || row.responsavel);

      const unidadeId = unitName ? resolveIdByName(unitName, unitOptions) : null;
      const usuarioId = collaboratorEmail
        ? resolveIdByName(collaboratorEmail, collaboratorEmailOptions)
        : collaboratorName
          ? resolveIdByName(collaboratorName, collaboratorNameOptions)
          : null;

      if (unitName && !unidadeId) {
        throw new Error(`Unidade nao encontrada: ${row.unidade || row.unidade_nome}`);
      }

      if ((collaboratorEmail || collaboratorName) && !usuarioId) {
        throw new Error(`Responsavel nao encontrado: ${row.responsavel_email || row.responsavel_nome || row.responsavel}`);
      }

      const payload = {
        nome: row.nome || null,
        categoria: row.categoria || null,
        marca: row.marca || null,
        modelo: row.modelo || null,
        numero_serie: row.numero_serie || null,
        patrimonio: row.patrimonio || null,
        unidade_id: unidadeId || null,
        localizacao_interna: row.localizacao_interna || null,
        observacao: row.observacao || null,
        estado: row.estado || null,
        usuario_id: usuarioId || null,
      };

      if (!payload.nome) throw new Error('Nome do ativo obrigatorio.');
      if (!payload.categoria) throw new Error('Categoria do ativo obrigatoria.');
      if (!payload.numero_serie) throw new Error('Numero de serie do ativo obrigatorio.');
      if (!payload.unidade_id) throw new Error('Unidade do ativo obrigatoria.');

      const createdRow = await createAsset(payload);
      created.push(createdRow);
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error.message || 'Falha ao importar.'}`);
    }
  }

  return { created, errors };
}

function normalizeImportDate(value, fieldLabel) {
  if (value === undefined || value === null || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`${fieldLabel} invalida.`);
    }
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`${fieldLabel} invalida.`);
    }
    return text;
  }

  const brDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brDate) {
    const [, day, month, year] = brDate;
    const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const date = new Date(`${normalized}T00:00:00Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() + 1 !== Number(month) ||
      date.getUTCDate() !== Number(day)
    ) {
      throw new Error(`${fieldLabel} invalida.`);
    }
    return normalized;
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (Number.isFinite(serial) && serial > 0) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const date = new Date(excelEpoch + serial * 24 * 60 * 60 * 1000);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
  }

  throw new Error(`${fieldLabel} invalida. Use AAAA-MM-DD ou DD/MM/AAAA.`);
}

export async function importCollaboratorRows({
  collaboratorsApiCreate,
  departments,
  normalizeText,
  resolveIdByName,
  rowsToImport,
  units,
}) {
  const provisionalEmailDomain = 'cadastro.macom.com.br';
  const departmentOptions = departments.map((item) => ({ id: item.id, normalized: normalizeText(item.nome) }));
  const unitOptions = units.map((item) => ({ id: item.id, normalized: normalizeText(item.nome) }));
  const created = [];
  const createdCredentials = [];
  const errors = [];

  for (let index = 0; index < rowsToImport.length; index += 1) {
    const row = rowsToImport[index];

    try {
      const departamentoNome = normalizeText(row.departamento || row.departamento_nome);
      const unidadeNome = normalizeText(row.unidade || row.unidade_nome);
      const departamentoId = departamentoNome ? resolveIdByName(departamentoNome, departmentOptions) : null;
      const unidadeId = unidadeNome ? resolveIdByName(unidadeNome, unitOptions) : null;
      const cpf = String(row.cpf || '').replace(/\D/g, '');
      const email = String(row.email || '').trim().toLowerCase() || (cpf ? `${cpf}@${provisionalEmailDomain}` : null);

      if (departamentoNome && !departamentoId) {
        throw new Error(`Departamento nao encontrado: ${row.departamento || row.departamento_nome}`);
      }

      if (unidadeNome && !unidadeId) {
        throw new Error(`Unidade nao encontrada: ${row.unidade || row.unidade_nome}`);
      }

      const payload = {
        nome: row.nome || null,
        email,
        funcao: 'usuario',
        cpf: cpf || null,
        telefone: row.telefone || null,
        departamento_id: departamentoId || null,
        cargo: row.cargo || null,
        data_nascimento: normalizeImportDate(row.data_nascimento, 'Data de nascimento'),
        data_admissao: normalizeImportDate(row.data_admissao, 'Data de admissao'),
        status: row.status || 'ativo',
        unidade_id: unidadeId || null,
      };

      if (!payload.nome) throw new Error('Nome obrigatorio.');
      if (!payload.email) throw new Error('Email obrigatorio ou CPF obrigatorio para gerar email provisório.');

      const { row: createdRow, generatedPassword } = await collaboratorsApiCreate(payload);
      created.push(createdRow);
      createdCredentials.push({ id: createdRow?.id, email: createdRow?.email || email, generatedPassword });
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error.message || 'Falha ao importar.'}`);
    }
  }

  return { created, createdCredentials, errors };
}

export async function importContactRows({
  contactsApiCreate,
  normalizeText,
  resolveIdByName,
  rowsToImport,
  units,
}) {
  const unitOptions = units.map((item) => ({ id: item.id, normalized: normalizeText(item.nome) }));
  const created = [];
  const errors = [];

  for (let index = 0; index < rowsToImport.length; index += 1) {
    const row = rowsToImport[index];

    try {
      const unidadeNome = normalizeText(row.unidade || row.unidade_nome);
      const unidadeId = unidadeNome ? resolveIdByName(unidadeNome, unitOptions) : null;

      if (unidadeNome && !unidadeId) {
        throw new Error(`Unidade nao encontrada: ${row.unidade || row.unidade_nome}`);
      }

      const payload = {
        tipo: row.tipo || 'fornecedor',
        nome: row.nome || null,
        identificador: row.identificador || row.cnpj || null,
        descricao: row.descricao || null,
        nome_contato: row.nome_contato || row.contato || null,
        telefone: row.telefone || null,
        email: row.email || null,
        unidade_id: unidadeId || null,
      };

      if (!payload.nome) throw new Error('Nome do fornecedor obrigatorio.');

      const createdRow = await contactsApiCreate(payload);
      created.push(createdRow);
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error.message || 'Falha ao importar.'}`);
    }
  }

  return { created, errors };
}

export async function importCorporateLineRows({
  collaborators,
  corporateLinesApiCreate,
  normalizeText,
  resolveIdByName,
  rowsToImport,
  units,
}) {
  const unitOptions = units.map((item) => ({ id: item.id, normalized: normalizeText(item.nome) }));
  const collaboratorEmailOptions = collaborators
    .filter((item) => item.email)
    .map((item) => ({ id: item.id, normalized: normalizeText(item.email) }));
  const collaboratorNameOptions = collaborators
    .filter((item) => item.nome)
    .map((item) => ({ id: item.id, normalized: normalizeText(item.nome) }));

  const created = [];
  const errors = [];

  for (let index = 0; index < rowsToImport.length; index += 1) {
    const row = rowsToImport[index];

    try {
      const unidadeNome = normalizeText(row.unidade || row.unidade_nome);
      const collaboratorEmail = normalizeText(row.colaborador_email || row.responsavel_email);
      const collaboratorName = normalizeText(row.colaborador_nome || row.responsavel_nome || row.colaborador || row.responsavel);

      const unidadeId = unidadeNome ? resolveIdByName(unidadeNome, unitOptions) : null;
      const colaboradorId = collaboratorEmail
        ? resolveIdByName(collaboratorEmail, collaboratorEmailOptions)
        : collaboratorName
          ? resolveIdByName(collaboratorName, collaboratorNameOptions)
          : null;

      if (unidadeNome && !unidadeId) {
        throw new Error(`Unidade nao encontrada: ${row.unidade || row.unidade_nome}`);
      }

      if ((collaboratorEmail || collaboratorName) && !colaboradorId) {
        throw new Error(`Colaborador nao encontrado: ${row.colaborador_email || row.responsavel_email || row.colaborador_nome || row.responsavel_nome || row.colaborador || row.responsavel}`);
      }

      const payload = {
        tipo: row.tipo || 'chip',
        nome: row.nome || null,
        numero: row.numero || null,
        operadora: row.operadora || null,
        status: row.status || 'disponivel',
        colaborador_id: colaboradorId || null,
        unidade_id: unidadeId || null,
        observacao: row.observacao || null,
      };

      if (!payload.numero) throw new Error('Numero obrigatorio.');

      const createdRow = await corporateLinesApiCreate(payload);
      created.push(createdRow);
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error.message || 'Falha ao importar.'}`);
    }
  }

  return { created, errors };
}
