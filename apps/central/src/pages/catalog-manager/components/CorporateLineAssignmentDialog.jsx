import CollaboratorAssignmentDialogBase from '@/pages/catalog-manager/components/CollaboratorAssignmentDialogBase';

export default function CorporateLineAssignmentDialog({ collaborators, loading, onOpenChange, onSubmit, open, record }) {
  return (
    <CollaboratorAssignmentDialogBase
      collaborators={collaborators}
      emptyLabel="Sem colaborador"
      fieldKey="colaborador_id"
      label="Colaborador"
      loading={loading}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      open={open}
      record={record}
      searchToRevealOptions
      title="Vincular Responsavel"
    />
  );
}
