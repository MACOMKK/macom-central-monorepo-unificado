import AssetAssignmentDialog from '@/pages/catalog-manager/components/AssetAssignmentDialog';
import CollaboratorLinksDialog from '@/pages/catalog-manager/components/CollaboratorLinksDialog';
import CorporateLineAssignmentDialog from '@/pages/catalog-manager/components/CorporateLineAssignmentDialog';
import PasswordResetDialog from '@/pages/catalog-manager/components/PasswordResetDialog';

export default function CatalogAuxDialogs({
  assetAssignment,
  collaboratorLinks,
  corporateLineAssignment,
  passwordReset,
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

      <PasswordResetDialog
        form={passwordReset.form}
        isPending={passwordReset.isPending}
        onClose={passwordReset.onClose}
        onConfirmPasswordChange={passwordReset.onConfirmPasswordChange}
        onCopyPassword={passwordReset.onCopyPassword}
        onGeneratePassword={passwordReset.onGeneratePassword}
        onPasswordChange={passwordReset.onPasswordChange}
        onSubmit={passwordReset.onSubmit}
        open={passwordReset.open}
      />
    </>
  );
}
