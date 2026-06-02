import { useMutation, useQueryClient } from '@tanstack/react-query';

import { catalogApi } from '@/lib/catalogApi';
import { buildImportFeedback } from '@/pages/catalog-manager/utils/importFeedback';
import {
  importAssetRows,
  importCollaboratorRows,
  importContactRows,
  importCorporateLineRows,
} from '@/pages/catalog-manager/utils/importCatalogRows';
import { importInfrastructureRows } from '@/pages/catalog-manager/utils/importInfrastructureRows';

function replaceCatalogRecord(rows, record) {
  if (!record?.id) return rows;
  return rows.map((row) => (row.id === record.id ? { ...row, ...record } : row));
}

function upsertCatalogRecords(rows, records) {
  const items = Array.isArray(records) ? records.filter((record) => record?.id) : [records].filter((record) => record?.id);
  if (!items.length) return rows;

  const recordsById = new Map(items.map((record) => [record.id, record]));
  const updatedRows = rows.map((row) => (
    recordsById.has(row.id) ? { ...row, ...recordsById.get(row.id) } : row
  ));
  const existingIds = new Set(updatedRows.map((row) => row.id));
  const newRows = items.filter((record) => !existingIds.has(record.id));

  return [...newRows, ...updatedRows];
}

function removeCatalogRecords(rows, ids) {
  const idsToRemove = new Set(Array.isArray(ids) ? ids : [ids]);
  return rows.filter((row) => !idsToRemove.has(row.id));
}

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
  onResetContactsImport,
  onResetCorporateLinesImport,
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
    queryClient.setQueryData([queryKey], (old = []) => (
      Array.isArray(old) ? upsertCatalogRecords(old, created) : old
    ));
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
    onMutate: async ({ record, payload }) => {
      const queryKey = [currentQueryKey];
      await queryClient.cancelQueries({ queryKey });
      const previousRows = queryClient.getQueryData(queryKey);
      const isUpdate = Boolean(record?.id);
      const optimisticRecord = {
        ...(record || {}),
        ...payload,
        id: record?.id || `temp-${lockedEntityKey}-${Date.now()}`,
        atualizado_em: new Date().toISOString(),
      };

      queryClient.setQueryData(queryKey, (old = []) => {
        if (!Array.isArray(old)) return old;
        return isUpdate ? replaceCatalogRecord(old, optimisticRecord) : [optimisticRecord, ...old];
      });
      onSaveSuccess?.();

      return { isUpdate, optimisticId: optimisticRecord.id, previousRows, queryKey };
    },
    onSuccess: (savedRecord, _variables, context) => {
      if (savedRecord?.id) {
        queryClient.setQueryData(context.queryKey, (old = []) => {
          if (!Array.isArray(old)) return old;
          if (context.isUpdate) return replaceCatalogRecord(old, savedRecord);
          return old.map((row) => (row.id === context.optimisticId ? savedRecord : row));
        });
      }

      handleMutationSuccess({
        queryKeys: [[currentQueryKey]],
        message: 'Registro salvo com sucesso.',
      });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousRows);
      }
      showMutationError(error, 'Falha ao salvar registro.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => catalogApi[lockedEntityKey].remove(id),
    onMutate: async (id) => {
      const queryKey = [currentQueryKey];
      await queryClient.cancelQueries({ queryKey });
      const previousRows = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old) ? removeCatalogRecords(old, id) : old
      ));

      return { previousRows, queryKey };
    },
    onSuccess: () => handleMutationSuccess({ queryKeys: [[currentQueryKey]], message: 'Registro removido com sucesso.' }),
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousRows);
      }
      showMutationError(error, 'Falha ao remover registro.');
    },
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
    onMutate: async (ids) => {
      const queryKey = [currentQueryKey];
      await queryClient.cancelQueries({ queryKey });
      const previousRows = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old) ? removeCatalogRecords(old, ids) : old
      ));

      return { previousRows, queryKey };
    },
    onSuccess: ({ failedIds, removedIds }, _variables, context) => {
      if (failedIds.length) {
        queryClient.setQueryData([currentQueryKey], (old = []) => {
          if (!Array.isArray(old)) return old;
          const failedRows = (context?.previousRows || []).filter((row) => failedIds.includes(row.id));
          const existingIds = new Set(old.map((row) => row.id));
          return [...failedRows.filter((row) => !existingIds.has(row.id)), ...old];
        });
      }

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
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousRows);
      }
      showMutationError(error, 'Falha ao remover os registros selecionados.');
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: async ({ id, payload }) => catalogApi.ativos.update(id, payload),
    onMutate: async ({ id, payload }) => {
      const queryKey = ['ativos'];
      await queryClient.cancelQueries({ queryKey });
      const previousRows = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old)
          ? replaceCatalogRecord(old, { id, ...payload, atualizado_em: new Date().toISOString() })
          : old
      ));

      return { previousRows, queryKey };
    },
    onSuccess: (updatedAsset, _variables, context) => {
      if (updatedAsset?.id) {
        queryClient.setQueryData(context.queryKey, (old = []) => (
          Array.isArray(old) ? replaceCatalogRecord(old, updatedAsset) : old
        ));
      }
      handleMutationSuccess({
        queryKeys: [['ativos']],
        message: 'Usuario vinculado com sucesso.',
        onSuccess: onAssignAssetSuccess,
      });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousRows);
      }
      showMutationError(error, 'Falha ao vincular usuario.');
    },
  });

  const assignCorporateLineMutation = useMutation({
    mutationFn: async ({ id, payload }) => catalogApi.linhas_corporativas.update(id, payload),
    onMutate: async ({ id, payload }) => {
      const queryKey = ['linhas_corporativas'];
      await queryClient.cancelQueries({ queryKey });
      const previousRows = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old)
          ? replaceCatalogRecord(old, { id, ...payload, atualizado_em: new Date().toISOString() })
          : old
      ));

      return { previousRows, queryKey };
    },
    onSuccess: (updatedLine, _variables, context) => {
      if (updatedLine?.id) {
        queryClient.setQueryData(context.queryKey, (old = []) => (
          Array.isArray(old) ? replaceCatalogRecord(old, updatedLine) : old
        ));
      }
      handleMutationSuccess({
        queryKeys: [['linhas_corporativas']],
        message: 'Responsavel vinculado com sucesso.',
        onSuccess: onAssignCorporateLineSuccess,
      });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousRows);
      }
      showMutationError(error, 'Falha ao vincular responsavel.');
    },
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

  const importContactsMutation = useMutation({
    mutationFn: async (rowsToImport) =>
      importContactRows({
        contactsApiCreate: catalogApi.contatos.create,
        normalizeText,
        resolveIdByName,
        rowsToImport,
        units,
      }),
    onSuccess: ({ created, errors }) =>
      handleImportSuccess({
        queryKey: 'contatos',
        created,
        errors,
        resetImportState: onResetContactsImport,
        successMessage: (createdCount) => `${createdCount} contato(s) importado(s) com sucesso.`,
        partialSuccessMessage: (createdCount, importErrors) =>
          `${createdCount} contato(s) importado(s). ${importErrors.length} linha(s) com erro: ${importErrors.slice(0, 3).join(' | ')}`,
        emptyMessage: 'Nenhum contato foi importado.',
      }),
    onError: (error) => showMutationError(error, 'Falha ao importar contatos.'),
  });

  const importCorporateLinesMutation = useMutation({
    mutationFn: async (rowsToImport) =>
      importCorporateLineRows({
        collaborators,
        corporateLinesApiCreate: catalogApi.linhas_corporativas.create,
        normalizeText,
        resolveIdByName,
        rowsToImport,
        units,
      }),
    onSuccess: ({ created, errors }) =>
      handleImportSuccess({
        queryKey: 'linhas_corporativas',
        created,
        errors,
        resetImportState: onResetCorporateLinesImport,
        successMessage: (createdCount) => `${createdCount} linha(s) corporativa(s) importada(s) com sucesso.`,
        partialSuccessMessage: (createdCount, importErrors) =>
          `${createdCount} linha(s) corporativa(s) importada(s). ${importErrors.length} linha(s) com erro: ${importErrors.slice(0, 3).join(' | ')}`,
        emptyMessage: 'Nenhuma linha corporativa foi importada.',
      }),
    onError: (error) => showMutationError(error, 'Falha ao importar linhas corporativas.'),
  });

  const unlinkAssignmentsMutation = useMutation({
    mutationFn: async (id) => catalogApi.colaboradores.unlinkAssignments(id),
    onMutate: async (id) => {
      const queryKeys = [
        ['ativos'],
        ['linhas_corporativas'],
        ['acessos_usuario_sistema'],
      ];
      await Promise.all(queryKeys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
      const previousData = new Map(queryKeys.map((queryKey) => [queryKey[0], queryClient.getQueryData(queryKey)]));

      queryClient.setQueryData(['ativos'], (old = []) => (
        Array.isArray(old)
          ? old.map((asset) => (
            asset.usuario_id === id
              ? { ...asset, usuario_id: null, atualizado_em: new Date().toISOString() }
              : asset
          ))
          : old
      ));
      queryClient.setQueryData(['linhas_corporativas'], (old = []) => (
        Array.isArray(old)
          ? old.map((line) => (
            line.colaborador_id === id
              ? { ...line, colaborador_id: null, atualizado_em: new Date().toISOString() }
              : line
          ))
          : old
      ));
      queryClient.setQueryData(['acessos_usuario_sistema'], (old = []) => (
        Array.isArray(old) ? old.filter((access) => access.colaborador_id !== id) : old
      ));

      return { previousData };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      queryClient.invalidateQueries({ queryKey: ['linhas_corporativas'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      queryClient.invalidateQueries({ queryKey: ['acessos_usuario_sistema'] });
      queryClient.invalidateQueries({ queryKey: ['sistemas'] });
      const ativosCount = result?.ativos_count || 0;
      const linhasCount = result?.linhas_count || 0;
      const sistemasCount = result?.sistemas_count || 0;
      const totalCount = result?.total_count || 0;
      setFeedback({
        type: 'success',
        message:
          totalCount > 0
            ? `${ativosCount} ativo(s), ${linhasCount} linha(s) e ${sistemasCount} sistema(s) desvinculado(s) com sucesso.`
            : 'Nenhum item vinculado para remover.',
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['ativos'], context.previousData.get('ativos'));
        queryClient.setQueryData(['linhas_corporativas'], context.previousData.get('linhas_corporativas'));
        queryClient.setQueryData(['acessos_usuario_sistema'], context.previousData.get('acessos_usuario_sistema'));
      }
      showMutationError(error, 'Falha ao desvincular itens.');
    },
  });

  return {
    assignCorporateLineMutation,
    assignUserMutation,
    deleteMutation,
    deleteManyMutation,
    importAssetsMutation,
    importCollaboratorsMutation,
    importContactsMutation,
    importCorporateLinesMutation,
    importInfrastructureMutation,
    passwordMutation,
    saveMutation,
    unlinkAssignmentsMutation,
  };
}
