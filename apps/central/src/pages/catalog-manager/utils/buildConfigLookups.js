export function createSelectOptions(items, labelKey = 'nome') {
  return items.map((item) => ({ value: item.id, label: item[labelKey] }));
}

export function createCollaboratorOptions(collaborators) {
  return collaborators.map((item) => ({
    value: item.id,
    label: item.nome || item.email || item.id,
  }));
}

export function createAssetOptions(assets) {
  return assets.map((item) => ({
    value: item.id,
    label: `${item.nome || 'Ativo'}${item.patrimonio ? ` - ${item.patrimonio}` : ''}${item.numero_serie ? ` - ${item.numero_serie}` : ''}`,
  }));
}

export function countByKey(items, key) {
  return items.reduce((acc, item) => {
    if (item[key]) {
      acc[item[key]] = (acc[item[key]] || 0) + 1;
    }
    return acc;
  }, {});
}

export function indexById(items) {
  return items.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

export function countAssetsByDepartmentId(assets, collaboratorsById) {
  return assets.reduce((acc, asset) => {
    const departmentId = asset.usuario_id ? collaboratorsById[asset.usuario_id]?.departamento_id : null;
    if (departmentId) {
      acc[departmentId] = (acc[departmentId] || 0) + 1;
    }
    return acc;
  }, {});
}

export function countAssetsByUnitId(assets) {
  return assets.reduce((acc, asset) => {
    const unitId = asset.unidade_id || null;
    if (unitId) {
      acc[unitId] = (acc[unitId] || 0) + 1;
    }
    return acc;
  }, {});
}
