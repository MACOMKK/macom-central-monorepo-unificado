import AssetsImportDialog from '@/pages/catalog-manager/components/AssetsImportDialog';
import CollaboratorsImportDialog from '@/pages/catalog-manager/components/CollaboratorsImportDialog';
import ImportPreviewTable from '@/pages/catalog-manager/components/ImportPreviewTable';
import InfrastructureImportDialog from '@/pages/catalog-manager/components/InfrastructureImportDialog';

export default function CatalogImportDialogs({
  assetsImport,
  collaboratorsImport,
  infrastructureImport,
}) {
  return (
    <>
      <AssetsImportDialog
        fileName={assetsImport.fileName}
        isPending={assetsImport.isPending}
        onClose={assetsImport.onClose}
        onConfirm={assetsImport.onConfirm}
        onDownloadCsvTemplate={assetsImport.onDownloadCsvTemplate}
        onDownloadJsonTemplate={assetsImport.onDownloadJsonTemplate}
        onFileChange={assetsImport.onFileChange}
        onOpenChange={assetsImport.onOpenChange}
        open={assetsImport.open}
        preview={
          <ImportPreviewTable
            rows={assetsImport.previewRows}
            columns={[
              { key: 'nome', label: 'Nome' },
              { key: 'categoria', label: 'Categoria' },
              { key: 'patrimonio', label: 'Patrimonio' },
              { key: 'unidade', label: 'Unidade' },
              { key: 'responsavel_email', label: 'Responsavel' },
            ]}
          />
        }
      />

      <CollaboratorsImportDialog
        fileName={collaboratorsImport.fileName}
        isPending={collaboratorsImport.isPending}
        onClose={collaboratorsImport.onClose}
        onConfirm={collaboratorsImport.onConfirm}
        onDownloadCsvTemplate={collaboratorsImport.onDownloadCsvTemplate}
        onDownloadJsonTemplate={collaboratorsImport.onDownloadJsonTemplate}
        onFileChange={collaboratorsImport.onFileChange}
        onOpenChange={collaboratorsImport.onOpenChange}
        open={collaboratorsImport.open}
        preview={
          <ImportPreviewTable
            rows={collaboratorsImport.previewRows}
            columns={[
              { key: 'nome', label: 'Nome' },
              { key: 'email', label: 'Email' },
              { key: 'funcao', label: 'Funcao' },
              { key: 'departamento', label: 'Departamento' },
              { key: 'unidade', label: 'Unidade' },
            ]}
          />
        }
      />

      <InfrastructureImportDialog
        fileName={infrastructureImport.fileName}
        isPending={infrastructureImport.isPending}
        onClose={infrastructureImport.onClose}
        onConfirm={infrastructureImport.onConfirm}
        onDownloadCsvTemplate={infrastructureImport.onDownloadCsvTemplate}
        onDownloadJsonTemplate={infrastructureImport.onDownloadJsonTemplate}
        onFileChange={infrastructureImport.onFileChange}
        onOpenChange={infrastructureImport.onOpenChange}
        open={infrastructureImport.open}
        preview={
          <ImportPreviewTable
            rows={infrastructureImport.previewRows}
            columns={[
              { key: 'tipo', label: 'Tipo' },
              { key: 'nome', label: 'Nome' },
              { key: 'valor_identificador', label: 'Valor' },
              { key: 'unidade', label: 'Unidade' },
            ]}
          />
        }
      />
    </>
  );
}
