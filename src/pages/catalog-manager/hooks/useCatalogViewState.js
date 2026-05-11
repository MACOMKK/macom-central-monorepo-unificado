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
  loadingByEntity,
  lockedEntityKey,
  search,
}) {
  const current = config[lockedEntityKey];

  const rows = useMemo(() => {
    return current.rows.filter((row) => {
      const query = search.toLowerCase();
      const matchesSearch =
        !query ||
        Object.values(row).some((value) => String(value || '').toLowerCase().includes(query)) ||
        collaborators
          .find((item) => item.id === row.usuario_id)
          ?.nome?.toLowerCase()
          .includes(query);

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
    lockedEntityKey,
    search,
  ]);

  return {
    current,
    isLoading: loadingByEntity[lockedEntityKey],
    rows,
  };
}
