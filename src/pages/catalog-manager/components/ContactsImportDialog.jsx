import ImportDialogShell from '@/pages/catalog-manager/components/ImportDialogShell';

export default function ContactsImportDialog({
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
      expectedFields="tipo,nome,identificador,descricao,nome_contato,telefone,email,unidade"
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
      title="Importar Contatos"
    />
  );
}
