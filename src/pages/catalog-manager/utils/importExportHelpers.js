function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function getImportTemplateExamples({ collaborators, departments, units }) {
  const unitName = units[0]?.nome || 'NOME_EXATO_DA_UNIDADE';
  const departmentName = departments[0]?.nome || 'NOME_EXATO_DO_DEPARTAMENTO';
  const collaboratorEmail = collaborators.find((item) => item.email)?.email || '';
  const suffix = String(Date.now()).slice(-6);

  return {
    assetPatrimony: `IMPORT-AT-${suffix}`,
    assetSerial: `SN-IMPORT-${suffix}`,
    collaboratorEmail,
    departmentName,
    unitName,
  };
}

export function downloadAssetsTemplate(examples) {
  const { assetPatrimony, assetSerial, collaboratorEmail, unitName } = examples;
  const csv = [
    'nome,categoria,marca,modelo,numero_serie,patrimonio,unidade,localizacao_interna,observacao,estado,responsavel_email',
    `Notebook Dell Latitude 5440,notebook,Dell,Latitude 5440,${assetSerial},${assetPatrimony},${unitName},Sala TI / Mesa 01,Equipamento principal,bom,${collaboratorEmail}`,
  ].join('\n');

  downloadFile(csv, 'modelo-importacao-ativos.csv', 'text/csv;charset=utf-8;');
}

export function downloadAssetsJsonTemplate(examples) {
  const { assetPatrimony, assetSerial, collaboratorEmail, unitName } = examples;
  const jsonModel = [
    {
      nome: 'Notebook Dell Latitude 5440',
      categoria: 'notebook',
      marca: 'Dell',
      modelo: 'Latitude 5440',
      numero_serie: assetSerial,
      patrimonio: assetPatrimony,
      unidade: unitName,
      localizacao_interna: 'Sala TI / Mesa 01',
      observacao: 'Equipamento principal',
      estado: 'bom',
      responsavel_email: collaboratorEmail,
    },
  ];

  downloadFile(JSON.stringify(jsonModel, null, 2), 'modelo-importacao-ativos.json', 'application/json;charset=utf-8;');
}

export function exportAssetsCsv({ assets, collaborators, units }) {
  const unitById = new Map(units.map((unit) => [unit.id, unit.nome]));
  const collaboratorById = new Map(collaborators.map((item) => [item.id, item.email || item.nome || '']));

  const header = [
    'nome',
    'categoria',
    'marca',
    'modelo',
    'numero_serie',
    'patrimonio',
    'unidade',
    'localizacao_interna',
    'observacao',
    'estado',
    'responsavel_email',
  ];

  const rows = assets.map((asset) => [
    asset.nome,
    asset.categoria,
    asset.marca,
    asset.modelo,
    asset.numero_serie,
    asset.patrimonio,
    unitById.get(asset.unidade_id) || '',
    asset.localizacao_interna,
    asset.observacao,
    asset.estado,
    collaboratorById.get(asset.usuario_id) || '',
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
  downloadFile(csv, 'ativos-exportados.csv', 'text/csv;charset=utf-8;');
}

export function downloadCollaboratorsTemplate(examples) {
  const { departmentName, unitName } = examples;
  const csv = [
    'nome,email,password,funcao,cpf,telefone,departamento,cargo,data_admissao,status,unidade',
    `Maria Souza,maria.souza@empresa.com.br,Temp.123456,usuario,11122233344,91999999999,${departmentName},Assistente,2026-05-07,ativo,${unitName}`,
  ].join('\n');

  downloadFile(csv, 'modelo-importacao-colaboradores.csv', 'text/csv;charset=utf-8;');
}

export function downloadCollaboratorsJsonTemplate(examples) {
  const { departmentName, unitName } = examples;
  const jsonModel = [
    {
      nome: 'Maria Souza',
      email: 'maria.souza@empresa.com.br',
      password: 'Temp.123456',
      funcao: 'usuario',
      cpf: '11122233344',
      telefone: '91999999999',
      departamento: departmentName,
      cargo: 'Assistente',
      data_admissao: '2026-05-07',
      status: 'ativo',
      unidade: unitName,
    },
  ];

  downloadFile(JSON.stringify(jsonModel, null, 2), 'modelo-importacao-colaboradores.json', 'application/json;charset=utf-8;');
}

export function exportCollaboratorsCsv({ collaborators, departments, units }) {
  const departmentById = new Map(departments.map((item) => [item.id, item.nome]));
  const unitById = new Map(units.map((item) => [item.id, item.nome]));
  const header = ['nome', 'email', 'funcao', 'cpf', 'telefone', 'departamento', 'cargo', 'data_admissao', 'status', 'unidade'];

  const rows = collaborators.map((item) => [
    item.nome,
    item.email,
    item.funcao,
    item.cpf,
    item.telefone,
    departmentById.get(item.departamento_id) || '',
    item.cargo,
    item.data_admissao ? String(item.data_admissao).slice(0, 10) : '',
    item.status,
    unitById.get(item.unidade_id) || '',
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
  downloadFile(csv, 'colaboradores-exportados.csv', 'text/csv;charset=utf-8;');
}

export function downloadInfrastructureTemplate(examples) {
  const { unitName } = examples;
  const csv = [
    'tipo,nome,valor_identificador,descricao,unidade',
    `ip,Servidor Principal,192.168.0.10,Servidor interno da matriz,${unitName}`,
    `link,Portal Comercial,https://portal.empresa.com.br,Sistema usado pela equipe comercial,${unitName}`,
  ].join('\n');

  downloadFile(csv, 'modelo-importacao-infraestrutura.csv', 'text/csv;charset=utf-8;');
}

export function downloadInfrastructureJsonTemplate(examples) {
  const { unitName } = examples;
  const jsonModel = [
    {
      tipo: 'ip',
      nome: 'Servidor Principal',
      valor_identificador: '192.168.0.10',
      descricao: 'Servidor interno da matriz',
      unidade: unitName,
    },
    {
      tipo: 'link',
      nome: 'Portal Comercial',
      valor_identificador: 'https://portal.empresa.com.br',
      descricao: 'Sistema usado pela equipe comercial',
      unidade: unitName,
    },
  ];

  downloadFile(JSON.stringify(jsonModel, null, 2), 'modelo-importacao-infraestrutura.json', 'application/json;charset=utf-8;');
}
