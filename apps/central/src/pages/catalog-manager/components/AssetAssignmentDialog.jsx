import CatalogEntityDialog from '@/components/CatalogEntityDialog';

export default function AssetAssignmentDialog({ collaborators, loading, onOpenChange, onSubmit, open, record }) {
  return (
    <CatalogEntityDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Vincular Usuario"
      description=""
      hideDescription
      record={record}
      fields={[
        {
          key: 'usuario_id',
          label: 'Usuario',
          type: 'select',
          allowEmpty: true,
          emptyLabel: 'Sem usuario',
          placeholder: 'Selecione um usuario',
          inputClassName: 'h-9 rounded-lg px-3 text-[14px]',
          options: collaborators.map((item) => ({
            value: item.id,
            label: item.nome || item.email || item.id,
          })),
        },
      ]}
      loading={loading}
      dialogClassName="max-w-[380px] rounded-[12px] p-4"
      formClassName="grid gap-3"
      footerClassName="justify-end gap-2 sm:space-x-0"
      cancelButtonClassName="h-8 rounded-lg px-4 text-[13px]"
      submitButtonClassName="h-8 rounded-lg px-4 text-[13px]"
      submitLabel="Salvar"
      onSubmit={onSubmit}
    />
  );
}
