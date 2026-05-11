import CatalogEntityDialog from '@/components/CatalogEntityDialog';

export default function CatalogRecordDialog({
  editingRecord,
  fields,
  isPending,
  lockedEntityKey,
  onOpenChange,
  onSubmit,
  singularLabel,
}) {
  const hasRecord = editingRecord?.id;

  return (
    <CatalogEntityDialog
      open={editingRecord !== null}
      onOpenChange={onOpenChange}
      title={
        lockedEntityKey === 'unidades'
          ? `${hasRecord ? 'Editar' : 'Nova'} Unidade`
          : lockedEntityKey === 'contatos'
            ? hasRecord
              ? 'Editar Fornecedor'
              : 'Novo Fornecedor'
            : lockedEntityKey === 'infra_estrutura'
              ? hasRecord
                ? 'Editar Registro'
                : 'Novo Registro'
              : lockedEntityKey === 'termos_posse'
                ? hasRecord
                  ? 'Editar Termo de Posse'
                  : 'Gerar Termo de Posse'
                : `${hasRecord ? 'Editar' : 'Novo'} ${singularLabel}`
      }
      description={
        lockedEntityKey === 'colaboradores' ||
        lockedEntityKey === 'ativos' ||
        lockedEntityKey === 'contatos' ||
        lockedEntityKey === 'linhas_corporativas' ||
        lockedEntityKey === 'infra_estrutura' ||
        lockedEntityKey === 'termos_posse'
          ? ''
          : 'Edite apenas os campos que existem hoje no banco.'
      }
      record={hasRecord ? editingRecord : null}
      fields={fields}
      loading={isPending}
      hideDescription={
        lockedEntityKey === 'unidades' ||
        lockedEntityKey === 'termos_posse' ||
        lockedEntityKey === 'infra_estrutura' ||
        lockedEntityKey === 'contatos' ||
        lockedEntityKey === 'linhas_corporativas'
      }
      dialogClassName={
        lockedEntityKey === 'unidades'
          ? 'max-w-[520px] rounded-[16px] border bg-background p-6 text-foreground shadow-[0_30px_80px_rgba(0,0,0,0.18)]'
          : lockedEntityKey === 'contatos'
            ? 'w-full max-w-lg max-h-[90vh] overflow-y-auto border bg-background p-6 shadow-lg sm:rounded-lg'
            : lockedEntityKey === 'linhas_corporativas'
              ? 'w-full max-w-lg max-h-[90vh] overflow-y-auto border bg-background p-6 shadow-lg sm:rounded-lg'
              : lockedEntityKey === 'infra_estrutura'
                ? 'w-full max-w-lg max-h-[90vh] overflow-y-auto border bg-background p-6 shadow-lg sm:rounded-lg'
                : lockedEntityKey === 'ativos'
                  ? 'max-w-[460px] rounded-[12px] p-3.5'
                  : lockedEntityKey === 'termos_posse'
                    ? 'max-w-[760px] rounded-[14px] p-4'
                    : undefined
      }
      formClassName={
        lockedEntityKey === 'unidades'
          ? 'grid gap-5 sm:grid-cols-2'
          : lockedEntityKey === 'contatos'
            ? 'mt-2 grid gap-4 sm:grid-cols-2'
            : lockedEntityKey === 'linhas_corporativas'
              ? 'mt-2 grid gap-4 sm:grid-cols-2'
              : lockedEntityKey === 'infra_estrutura'
                ? 'mt-2 space-y-4'
                : lockedEntityKey === 'ativos'
                  ? 'grid gap-2.5 sm:grid-cols-2'
                  : lockedEntityKey === 'termos_posse'
                    ? 'grid gap-3 sm:grid-cols-2'
                    : undefined
      }
      footerClassName={
        lockedEntityKey === 'unidades' || lockedEntityKey === 'infra_estrutura' || lockedEntityKey === 'contatos'
          ? 'justify-end gap-3 pt-2 sm:space-x-0'
          : undefined
      }
      cancelLabel={
        lockedEntityKey === 'unidades' || lockedEntityKey === 'infra_estrutura' || lockedEntityKey === 'contatos'
          ? 'Cancelar'
          : undefined
      }
      submitLabel={
        lockedEntityKey === 'unidades'
          ? hasRecord
            ? 'Salvar'
            : 'Cadastrar'
          : lockedEntityKey === 'contatos'
            ? hasRecord
              ? 'Salvar'
              : 'Cadastrar'
            : lockedEntityKey === 'infra_estrutura'
              ? hasRecord
                ? 'Salvar'
                : 'Cadastrar'
              : undefined
      }
      cancelButtonClassName={
        lockedEntityKey === 'unidades' || lockedEntityKey === 'infra_estrutura' || lockedEntityKey === 'contatos'
          ? 'h-9 rounded-md px-4 py-2 text-sm font-medium'
          : undefined
      }
      submitButtonClassName={
        lockedEntityKey === 'unidades'
          ? 'h-10 rounded-lg bg-[#d1131f] px-6 text-[15px] text-white hover:bg-[#b50f1a]'
          : lockedEntityKey === 'contatos'
            ? 'h-9 gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
            : lockedEntityKey === 'infra_estrutura'
              ? 'h-9 gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
              : lockedEntityKey === 'ativos'
                ? 'h-8 rounded-lg px-4 text-[13px]'
                : lockedEntityKey === 'termos_posse'
                  ? 'h-9 rounded-lg px-4 text-[13px]'
                  : undefined
      }
      onSubmit={onSubmit}
    />
  );
}
