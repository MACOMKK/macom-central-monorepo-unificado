import ImportDialogShell from '@/pages/catalog-manager/components/ImportDialogShell';

export default function CollaboratorsImportDialog({
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
      expectedFields="nome,email,password,funcao,cpf,telefone,departamento,cargo,data_nascimento,data_admissao,status,unidade"
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
      title="Importar Colaboradores"
    />
  );
}
