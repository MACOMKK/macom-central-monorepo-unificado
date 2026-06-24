import { useMemo } from 'react';

export function useCatalogViewState({
  assetCategoryFilter,
  assetStatusFilter,
  assetUnitFilter,
  collaborators,
  collaboratorDepartmentFilter,
  collaboratorStatusFilter,
  collaboratorUnitFilter,
  config,
  departments,
  loadingByEntity,
  lockedEntityKey,
  positionDepartmentFilter,
  search,
}) {
  const current = config[lockedEntityKey];

  const rows = useMemo(() => {
    const departmentsById = new Map((departments || []).map((department) => [department.id, department]));

    return current.rows.filter((row) => {
      const query = search.toLowerCase();
      let matchesSearch =
        !query ||
        Object.values(row).some((value) => String(value || '').toLowerCase().includes(query)) ||
        collaborators.find((item) => item.id === row.usuario_id)?.nome?.toLowerCase().includes(query);

      if (lockedEntityKey === 'cargos') {
        const departmentName = departmentsById.get(row.departamento_id)?.nome || 'Sem departamento';
        matchesSearch =
          !query ||
          String(row.nome || '').toLowerCase().includes(query) ||
          departmentName.toLowerCase().includes(query);

        const matchesDepartment =
          positionDepartmentFilter === 'all' ||
          (positionDepartmentFilter === 'none' ? !row.departamento_id : row.departamento_id === positionDepartmentFilter);

        return matchesSearch && matchesDepartment;
      }

      if (lockedEntityKey !== 'ativos') {
        if (lockedEntityKey !== 'colaboradores') {
          return matchesSearch;
        }

        const matchesUnit = collaboratorUnitFilter === 'all' || row.unidade_id === collaboratorUnitFilter;
        const matchesDepartment = collaboratorDepartmentFilter === 'all' || row.departamento_id === collaboratorDepartmentFilter;
        const matchesStatus = collaboratorStatusFilter === 'all' || row.status === collaboratorStatusFilter;

        return matchesSearch && matchesUnit && matchesDepartment && matchesStatus;
      }

      const matchesStatus = assetStatusFilter === 'all' || row.status === assetStatusFilter;
      const matchesCategory = assetCategoryFilter === 'all' || row.categoria === assetCategoryFilter;
      const matchesUnit = assetUnitFilter === 'all' || row.unidade_id === assetUnitFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesUnit;
    });
  }, [
    assetCategoryFilter,
    assetStatusFilter,
    assetUnitFilter,
    collaboratorDepartmentFilter,
    collaboratorStatusFilter,
    collaboratorUnitFilter,
    collaborators,
    current.rows,
    departments,
    lockedEntityKey,
    positionDepartmentFilter,
    search,
  ]);

  return {
    current,
    isLoading: loadingByEntity[lockedEntityKey],
    rows,
  };
}
