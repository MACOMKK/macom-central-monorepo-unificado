import CollaboratorAssignmentDialogBase from '@/pages/catalog-manager/components/CollaboratorAssignmentDialogBase';

export default function AssetAssignmentDialog({ collaborators, loading, onOpenChange, onSubmit, open, record }) {
  return (
    <CollaboratorAssignmentDialogBase
      collaborators={collaborators}
      emptyLabel="Sem usuario"
      fieldKey="usuario_id"
      label="Usuario"
      loading={loading}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      open={open}
      record={record}
      searchToRevealOptions
      title="Vincular Usuario"
    />
  );
}
