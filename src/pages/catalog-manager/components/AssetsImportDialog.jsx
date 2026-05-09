import ImportDialogShell from '@/pages/catalog-manager/components/ImportDialogShell';

export default function AssetsImportDialog({
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
      expectedFields="nome,categoria,marca,modelo,numero_serie,patrimonio,unidade,localizacao_interna,observacao,estado,responsavel_email"
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
      title="Importar Ativos"
    />
  );
}
