import ImportDialogShell from '@/pages/catalog-manager/components/ImportDialogShell';

export default function CorporateLinesImportDialog({
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
      expectedFields="tipo,nome,numero,operadora,status,colaborador_email,unidade,observacao"
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
      title="Importar Linhas Corporativas"
    />
  );
}
