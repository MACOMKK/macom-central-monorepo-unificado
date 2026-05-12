import {
  downloadAssetsJsonTemplate,
  downloadAssetsTemplate,
  downloadCollaboratorsJsonTemplate,
  downloadCollaboratorsTemplate,
  downloadContactsJsonTemplate,
  downloadContactsTemplate,
  downloadCorporateLinesJsonTemplate,
  downloadCorporateLinesTemplate,
  downloadInfrastructureJsonTemplate,
  downloadInfrastructureTemplate,
  exportAssetsCsv,
  exportCollaboratorsCsv,
  getImportTemplateExamples,
} from '@/pages/catalog-manager/utils/importExportHelpers';
import { readImportFileRows } from '@/pages/catalog-manager/utils/importParsers';

export function useCatalogImportActions({
  assets,
  collaborators,
  departments,
  importAssetsMutation,
  importAssetsPreview,
  importContactsFile,
  importContactsMutation,
  importContactsPreview,
  importCollaboratorsMutation,
  importCollaboratorsPreview,
  importCorporateLinesFile,
  importCorporateLinesMutation,
  importCorporateLinesPreview,
  importFile,
  importInfrastructureMutation,
  importInfrastructurePreview,
  importInfrastructureFile,
  importCollaboratorsFile,
  setFeedback,
  setImportAssetsOpen,
  setImportAssetsPreview,
  setImportCollaboratorsFile,
  setImportCollaboratorsOpen,
  setImportCollaboratorsPreview,
  setImportContactsFile,
  setImportContactsOpen,
  setImportContactsPreview,
  setImportCorporateLinesFile,
  setImportCorporateLinesOpen,
  setImportCorporateLinesPreview,
  setImportFile,
  setImportInfrastructureFile,
  setImportInfrastructureOpen,
  setImportInfrastructurePreview,
  units,
}) {
  const templateExamples = getImportTemplateExamples({ collaborators, departments, units });

  const handleImportFileSelection = async (event, onSuccess) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rowsToImport = await readImportFileRows(file);
      onSuccess(file, rowsToImport);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Falha ao ler arquivo de importacao.' });
    } finally {
      event.target.value = '';
    }
  };

  return {
    handleConfirmImportAssets: async () => {
      if (!importFile || !importAssetsPreview.length) {
        setFeedback({ type: 'error', message: 'Escolha um arquivo para importar.' });
        return;
      }

      importAssetsMutation.mutate(importAssetsPreview);
    },
    handleConfirmImportCollaborators: async () => {
      if (!importCollaboratorsFile || !importCollaboratorsPreview.length) {
        setFeedback({ type: 'error', message: 'Escolha um arquivo para importar.' });
        return;
      }

      importCollaboratorsMutation.mutate(importCollaboratorsPreview);
    },
    handleConfirmImportContacts: async () => {
      if (!importContactsFile || !importContactsPreview.length) {
        setFeedback({ type: 'error', message: 'Escolha um arquivo para importar.' });
        return;
      }

      importContactsMutation.mutate(importContactsPreview);
    },
    handleConfirmImportCorporateLines: async () => {
      if (!importCorporateLinesFile || !importCorporateLinesPreview.length) {
        setFeedback({ type: 'error', message: 'Escolha um arquivo para importar.' });
        return;
      }

      importCorporateLinesMutation.mutate(importCorporateLinesPreview);
    },
    handleConfirmImportInfrastructure: async () => {
      if (!importInfrastructureFile || !importInfrastructurePreview.length) {
        setFeedback({ type: 'error', message: 'Escolha um arquivo para importar.' });
        return;
      }

      importInfrastructureMutation.mutate(importInfrastructurePreview);
    },
    handleDownloadAssetsJsonTemplate: () => {
      downloadAssetsJsonTemplate(templateExamples);
    },
    handleDownloadAssetsTemplate: () => {
      downloadAssetsTemplate(templateExamples);
    },
    handleDownloadCollaboratorsJsonTemplate: () => {
      downloadCollaboratorsJsonTemplate(templateExamples);
    },
    handleDownloadCollaboratorsTemplate: () => {
      downloadCollaboratorsTemplate(templateExamples);
    },
    handleDownloadContactsJsonTemplate: () => {
      downloadContactsJsonTemplate(templateExamples);
    },
    handleDownloadContactsTemplate: () => {
      downloadContactsTemplate(templateExamples);
    },
    handleDownloadCorporateLinesJsonTemplate: () => {
      downloadCorporateLinesJsonTemplate(templateExamples);
    },
    handleDownloadCorporateLinesTemplate: () => {
      downloadCorporateLinesTemplate(templateExamples);
    },
    handleDownloadInfrastructureJsonTemplate: () => {
      downloadInfrastructureJsonTemplate(templateExamples);
    },
    handleDownloadInfrastructureTemplate: () => {
      downloadInfrastructureTemplate(templateExamples);
    },
    handleExportAssetsCsv: () => {
      exportAssetsCsv({ assets, collaborators, units });
    },
    handleExportCollaboratorsCsv: () => {
      exportCollaboratorsCsv({ collaborators, departments, units });
    },
    handleImportAssetsFile: async (event) =>
      handleImportFileSelection(event, (file, rowsToImport) => {
        setImportFile(file);
        setImportAssetsPreview(rowsToImport);
      }),
    handleImportCollaboratorsFile: async (event) =>
      handleImportFileSelection(event, (file, rowsToImport) => {
        setImportCollaboratorsFile(file);
        setImportCollaboratorsPreview(rowsToImport);
      }),
    handleImportContactsFile: async (event) =>
      handleImportFileSelection(event, (file, rowsToImport) => {
        setImportContactsFile(file);
        setImportContactsPreview(rowsToImport);
      }),
    handleImportCorporateLinesFile: async (event) =>
      handleImportFileSelection(event, (file, rowsToImport) => {
        setImportCorporateLinesFile(file);
        setImportCorporateLinesPreview(rowsToImport);
      }),
    handleImportInfrastructureFile: async (event) =>
      handleImportFileSelection(event, (file, rowsToImport) => {
        setImportInfrastructureFile(file);
        setImportInfrastructurePreview(rowsToImport);
      }),
    openAssetsImportDialog: () => {
      setImportAssetsOpen(true);
      setImportFile(null);
    },
    openCollaboratorsImportDialog: () => {
      setImportCollaboratorsOpen(true);
      setImportCollaboratorsFile(null);
    },
    openContactsImportDialog: () => {
      setImportContactsOpen(true);
      setImportContactsFile(null);
      setImportContactsPreview([]);
    },
    openCorporateLinesImportDialog: () => {
      setImportCorporateLinesOpen(true);
      setImportCorporateLinesFile(null);
      setImportCorporateLinesPreview([]);
    },
    openInfrastructureImportDialog: () => {
      setImportInfrastructureOpen(true);
      setImportInfrastructureFile(null);
      setImportInfrastructurePreview([]);
    },
  };
}
