import AssetAssignmentDialog from '@/pages/catalog-manager/components/AssetAssignmentDialog';
import CollaboratorLinksDialog from '@/pages/catalog-manager/components/CollaboratorLinksDialog';
import CorporateLineAssignmentDialog from '@/pages/catalog-manager/components/CorporateLineAssignmentDialog';

export default function CatalogAuxDialogs({
  assetAssignment,
  collaboratorLinks,
  corporateLineAssignment,
}) {
  return (
    <>
      <AssetAssignmentDialog
        collaborators={assetAssignment.collaborators}
        loading={assetAssignment.loading}
        onOpenChange={assetAssignment.onOpenChange}
        onSubmit={assetAssignment.onSubmit}
        open={assetAssignment.open}
        record={assetAssignment.record}
      />

      <CorporateLineAssignmentDialog
        collaborators={corporateLineAssignment.collaborators}
        loading={corporateLineAssignment.loading}
        onOpenChange={corporateLineAssignment.onOpenChange}
        onSubmit={corporateLineAssignment.onSubmit}
        open={corporateLineAssignment.open}
        record={corporateLineAssignment.record}
      />

      <CollaboratorLinksDialog
        assets={collaboratorLinks.assets}
        collaborator={collaboratorLinks.collaborator}
        departmentName={collaboratorLinks.departmentName}
        formatDate={collaboratorLinks.formatDate}
        formatPhone={collaboratorLinks.formatPhone}
        lines={collaboratorLinks.lines}
        onOpenChange={collaboratorLinks.onOpenChange}
        open={collaboratorLinks.open}
        systems={collaboratorLinks.systems}
        unitName={collaboratorLinks.unitName}
      />
    </>
  );
}
