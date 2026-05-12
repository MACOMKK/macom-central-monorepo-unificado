import { useMutation, useQueryClient } from '@tanstack/react-query';

import { catalogApi } from '@/lib/catalogApi';
import { buildImportFeedback } from '@/pages/catalog-manager/utils/importFeedback';
import { importAssetRows, importCollaboratorRows } from '@/pages/catalog-manager/utils/importCatalogRows';
import { importInfrastructureRows } from '@/pages/catalog-manager/utils/importInfrastructureRows';

export function useCatalogMutations({
  collaborators,
  currentQueryKey,
  departments,
  lockedEntityKey,
  normalizeText,
  onAssignAssetSuccess,
  onAssignCorporateLineSuccess,
  onPasswordSuccess,
  onResetAssetsImport,
  onResetCollaboratorsImport,
  onResetInfrastructureImport,
  onSaveSuccess,
  resolveIdByName,
  setFeedback,
  units,
}) {
  const queryClient = useQueryClient();

  const showMutationError = (error, fallbackMessage) => {
    setFeedback({ type: 'error', message: error.message || fallbackMessage });
  };

  const handleMutationSuccess = ({ queryKeys = [], message, onSuccess }) => {
    queryKeys.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
    setFeedback({ type: 'success', message });
    onSuccess?.();
  };

  const handleImportSuccess = ({
    queryKey,
    created,
    errors,
    resetImportState,
    successMessage,
    partialSuccessMessage,
    emptyMessage,
  }) => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    resetImportState();
    setFeedback(
      buildImportFeedback({
        createdCount: created.length,
        errors,
        successMessage,
        partialSuccessMessage,
        emptyMessage,
      }),
    );
  };

  const saveMutation = useMutation({
    mutationFn: async ({ record, payload }) => {
      if (record?.id) {
        return catalogApi[lockedEntityKey].update(record.id, payload);
      }
      return catalogApi[lockedEntityKey].create(payload);
    },
    onSuccess: () =>
      handleMutationSuccess({
        queryKeys: [[currentQueryKey]],
        message: 'Registro salvo com sucesso.',
        onSuccess: onSaveSuccess,
      }),
    onError: (error) => showMutationError(error, 'Falha ao salvar registro.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => catalogApi[lockedEntityKey].remove(id),
    onSuccess: () => handleMutationSuccess({ queryKeys: [[currentQueryKey]], message: 'Registro removido com sucesso.' }),
    onError: (error) => showMutationError(error, 'Falha ao remover registro.'),
  });

  const deleteManyMutation = useMutation({
    mutationFn: async (ids) => {
      const results = await Promise.allSettled(ids.map((id) => catalogApi[lockedEntityKey].remove(id)));

      return results.reduce(
        (acc, result, index) => {
          if (result.status === 'fulfilled') {
            acc.removedIds.push(ids[index]);
          } else {
            acc.failedIds.push(ids[index]);
          }

          return acc;
        },
        { failedIds: [], removedIds: [] },
      );
    },
    onSuccess: ({ failedIds, removedIds }) => {
      if (removedIds.length) {
        queryClient.invalidateQueries({ queryKey: [currentQueryKey] });
      }

      if (!failedIds.length) {
        setFeedback({
          type: 'success',
          message: `${removedIds.length} registro(s) removido(s) com sucesso.`,
        });
        return;
      }

      setFeedback({
        type: 'error',
        message: removedIds.length
          ? `${removedIds.length} registro(s) removido(s), mas ${failedIds.length} falharam.`
          : 'Falha ao remover os registros selecionados.',
      });
    },
    onError: (error) => showMutationError(error, 'Falha ao remover os registros selecionados.'),
  });

  const assignUserMutation = useMutation({
    mutationFn: async ({ id, payload }) => catalogApi.ativos.update(id, payload),
    onSuccess: () =>
      handleMutationSuccess({
        queryKeys: [['ativos']],
        message: 'Usuario vinculado com sucesso.',
        onSuccess: onAssignAssetSuccess,
      }),
    onError: (error) => showMutationError(error, 'Falha ao vincular usuario.'),
  });

  const assignCorporateLineMutation = useMutation({
    mutationFn: async ({ id, payload }) => catalogApi.linhas_corporativas.update(id, payload),
    onSuccess: () =>
      handleMutationSuccess({
        queryKeys: [['linhas_corporativas']],
        message: 'Responsavel vinculado com sucesso.',
        onSuccess: onAssignCorporateLineSuccess,
      }),
    onError: (error) => showMutationError(error, 'Falha ao vincular responsavel.'),
  });

  const passwordMutation = useMutation({
    mutationFn: async ({ id, password }) => catalogApi.colaboradores.updatePassword(id, password),
    onSuccess: () =>
      handleMutationSuccess({
        message: 'Senha atualizada com sucesso.',
        onSuccess: onPasswordSuccess,
      }),
    onError: (error) => showMutationError(error, 'Falha ao atualizar senha.'),
  });

  const importAssetsMutation = useMutation({
    mutationFn: async (rowsToImport) =>
      importAssetRows({
        collaborators,
        createAsset: catalogApi.ativos.create,
        normalizeText,
        resolveIdByName,
        rowsToImport,
        units,
      }),
    onSuccess: ({ created, errors }) =>
      handleImportSuccess({
        queryKey: 'ativos',
        created,
        errors,
        resetImportState: onResetAssetsImport,
        successMessage: (createdCount) => `${createdCount} ativo(s) importado(s) com sucesso.`,
        partialSuccessMessage: (createdCount, importErrors) =>
          `${createdCount} ativo(s) importado(s). ${importErrors.length} linha(s) com erro: ${importErrors.slice(0, 3).join(' | ')}`,
        emptyMessage: 'Nenhum ativo foi importado.',
      }),
    onError: (error) => showMutationError(error, 'Falha ao importar ativos.'),
  });

  const importCollaboratorsMutation = useMutation({
    mutationFn: async (rowsToImport) =>
      importCollaboratorRows({
        collaboratorsApiCreate: catalogApi.colaboradores.create,
        departments,
        normalizeText,
        resolveIdByName,
        rowsToImport,
        units,
      }),
    onSuccess: ({ created, errors }) =>
      handleImportSuccess({
        queryKey: 'colaboradores',
        created,
        errors,
        resetImportState: onResetCollaboratorsImport,
        successMessage: (createdCount) => `${createdCount} colaborador(es) importado(s) com sucesso.`,
        partialSuccessMessage: (createdCount, importErrors) =>
          `${createdCount} colaborador(es) importado(s). ${importErrors.length} linha(s) com erro: ${importErrors.slice(0, 3).join(' | ')}`,
        emptyMessage: 'Nenhum colaborador foi importado.',
      }),
    onError: (error) => showMutationError(error, 'Falha ao importar colaboradores.'),
  });

  const importInfrastructureMutation = useMutation({
    mutationFn: async (rowsToImport) => {
      const unitOptions = units.map((item) => ({ id: item.id, normalized: normalizeText(item.nome) }));
      return importInfrastructureRows({
        rowsToImport,
        unitOptions,
        normalizeText,
        resolveIdByName,
      });
    },
    onSuccess: ({ created, errors }) =>
      handleImportSuccess({
        queryKey: 'infra_estrutura',
        created,
        errors,
        resetImportState: onResetInfrastructureImport,
        successMessage: (createdCount) => `${createdCount} registro(s) de infraestrutura importado(s) com sucesso.`,
        partialSuccessMessage: (createdCount, importErrors) =>
          `${createdCount} registro(s) importado(s). ${importErrors.length} linha(s) com erro: ${importErrors.slice(0, 3).join(' | ')}`,
        emptyMessage: 'Nenhum registro de infraestrutura foi importado.',
      }),
    onError: (error) => showMutationError(error, 'Falha ao importar infraestrutura.'),
  });

  const unlinkAssignmentsMutation = useMutation({
    mutationFn: async (id) => catalogApi.colaboradores.unlinkAssignments(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      queryClient.invalidateQueries({ queryKey: ['linhas_corporativas'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      const ativosCount = result?.ativos_count || 0;
      const linhasCount = result?.linhas_count || 0;
      const totalCount = result?.total_count || 0;
      setFeedback({
        type: 'success',
        message:
          totalCount > 0
            ? `${ativosCount} ativo(s) e ${linhasCount} linha(s) desvinculado(s) com sucesso.`
            : 'Nenhum item vinculado para remover.',
      });
    },
    onError: (error) => showMutationError(error, 'Falha ao desvincular itens.'),
  });

  return {
    assignCorporateLineMutation,
    assignUserMutation,
    deleteMutation,
    deleteManyMutation,
    importAssetsMutation,
    importCollaboratorsMutation,
    importInfrastructureMutation,
    passwordMutation,
    saveMutation,
    unlinkAssignmentsMutation,
  };
}
