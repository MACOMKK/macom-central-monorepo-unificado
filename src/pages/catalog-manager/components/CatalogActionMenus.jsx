import AssetActionsMenu from '@/pages/catalog-manager/components/AssetActionsMenu';
import CollaboratorActionsMenu from '@/pages/catalog-manager/components/CollaboratorActionsMenu';
import ContactActionsMenu from '@/pages/catalog-manager/components/ContactActionsMenu';
import CorporateLineActionsMenu from '@/pages/catalog-manager/components/CorporateLineActionsMenu';
import InfrastructureActionsMenu from '@/pages/catalog-manager/components/InfrastructureActionsMenu';

export default function CatalogActionMenus({
  assetMenu,
  assetMenuHandlers,
  collaboratorCanUnlinkAll,
  collaboratorMenu,
  collaboratorMenuHandlers,
  contactMenu,
  contactMenuHandlers,
  corporateLineMenu,
  corporateLineMenuHandlers,
  infrastructureMenu,
  infrastructureMenuHandlers,
  isUnlinking,
}) {
  return (
    <>
      <AssetActionsMenu
        menu={assetMenu}
        onAssign={assetMenuHandlers.onAssign}
        onDelete={assetMenuHandlers.onDelete}
        onEdit={assetMenuHandlers.onEdit}
      />

      <ContactActionsMenu
        menu={contactMenu}
        onDelete={contactMenuHandlers.onDelete}
        onEdit={contactMenuHandlers.onEdit}
      />

      <CorporateLineActionsMenu
        menu={corporateLineMenu}
        onAssign={corporateLineMenuHandlers.onAssign}
        onDelete={corporateLineMenuHandlers.onDelete}
        onEdit={corporateLineMenuHandlers.onEdit}
      />

      <InfrastructureActionsMenu
        menu={infrastructureMenu}
        onDelete={infrastructureMenuHandlers.onDelete}
        onEdit={infrastructureMenuHandlers.onEdit}
      />

      <CollaboratorActionsMenu
        canUnlinkAll={collaboratorCanUnlinkAll}
        isUnlinking={isUnlinking}
        menu={collaboratorMenu}
        onDelete={collaboratorMenuHandlers.onDelete}
        onEdit={collaboratorMenuHandlers.onEdit}
        onResetPassword={collaboratorMenuHandlers.onResetPassword}
        onUnlinkAll={collaboratorMenuHandlers.onUnlinkAll}
      />
    </>
  );
}
