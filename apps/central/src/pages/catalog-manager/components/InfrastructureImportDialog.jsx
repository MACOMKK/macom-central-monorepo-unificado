import ImportDialogShell from '@/pages/catalog-manager/components/ImportDialogShell';

export default function InfrastructureImportDialog({
  fileName,
  isPending,
  onClose,
  onConfirm,
  onDownloadCsvTemplate,
  onDownloadJsonTemplate,
  onFileChange,
  onOpenChange,
  open,
  preview,
}) {
  return (
    <ImportDialogShell
      expectedFields="tipo,nome,valor_identificador,descricao,unidade"
      fileName={fileName}
      isPending={isPending}
      onClose={onClose}
      onConfirm={onConfirm}
      onDownloadCsvTemplate={onDownloadCsvTemplate}
      onDownloadJsonTemplate={onDownloadJsonTemplate}
      onFileChange={onFileChange}
      onOpenChange={onOpenChange}
      open={open}
      preview={preview}
      title="Importar Infraestrutura"
    />
  );
}
