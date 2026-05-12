export function useCatalogActionHandlers({
  assetMenu,
  assets,
  closeMenu,
  collaboratorMenu,
  corporateLineMenu,
  corporateLines,
  contactMenu,
  deleteRecord,
  infrastructureMenu,
  openRecord,
  openAssetAssignment,
  openCorporateLineAssignment,
  openPasswordReset,
  runWithClosedMenu,
  setFeedback,
  unlinkAssignments,
}) {
  const showMenuError = (message) => {
    setFeedback({ type: 'error', message });
    closeMenu();
  };

  const openRecordEditor = (menu) => {
    openRecord(menu.row);
    closeMenu();
  };

  const confirmMenuDeletion = (rowId, message) => {
    const confirmed = window.confirm(message);
    if (!confirmed) {
      closeMenu();
      return;
    }

    runWithClosedMenu(() => deleteRecord(rowId));
  };

  const openMenuAssignment = (openAssignment, menu) => {
    openAssignment(menu.row);
    closeMenu();
  };

  const hasLinkedCollaboratorItems = (collaboratorId) =>
    assets.some((asset) => asset.usuario_id === collaboratorId) ||
    corporateLines.some((line) => line.colaborador_id === collaboratorId);

  const collaboratorCanUnlinkAll = Boolean(
    collaboratorMenu &&
      collaboratorMenu.row.status === 'inativo' &&
      hasLinkedCollaboratorItems(collaboratorMenu.row.id)
  );

  const assetMenuHandlers = {
    onAssign: () => openMenuAssignment(openAssetAssignment, assetMenu),
    onDelete: () => {
      if (assetMenu?.row?.usuario_id) {
        showMenuError('Nao e permitido excluir um ativo com usuario vinculado.');
        return;
      }

      confirmMenuDeletion(
        assetMenu.row.id,
        `Deseja realmente excluir ${assetMenu?.row?.nome || assetMenu?.row?.patrimonio || 'este ativo'}?`
      );
    },
    onEdit: () => openRecordEditor(assetMenu),
  };

  const contactMenuHandlers = {
    onDelete: () => {
      confirmMenuDeletion(
        contactMenu.row.id,
        `Deseja realmente excluir ${contactMenu?.row?.nome || 'este contato'}?`
      );
    },
    onEdit: () => openRecordEditor(contactMenu),
  };

  const corporateLineMenuHandlers = {
    onAssign: () => openMenuAssignment(openCorporateLineAssignment, corporateLineMenu),
    onDelete: () => {
      if (corporateLineMenu?.row?.colaborador_id) {
        showMenuError('Nao e permitido excluir uma linha corporativa com colaborador vinculado.');
        return;
      }

      confirmMenuDeletion(
        corporateLineMenu.row.id,
        `Deseja realmente excluir ${corporateLineMenu?.row?.nome || corporateLineMenu?.row?.numero || 'esta linha corporativa'}?`
      );
    },
    onEdit: () => openRecordEditor(corporateLineMenu),
  };

  const infrastructureMenuHandlers = {
    onDelete: () => {
      confirmMenuDeletion(
        infrastructureMenu.row.id,
        `Deseja realmente excluir ${infrastructureMenu?.row?.nome || 'este registro de infraestrutura'}?`
      );
    },
    onEdit: () => openRecordEditor(infrastructureMenu),
  };

  const collaboratorMenuHandlers = {
    onDelete: () => {
      if (hasLinkedCollaboratorItems(collaboratorMenu?.row?.id)) {
        showMenuError('Nao e permitido excluir um colaborador com itens vinculados.');
        return;
      }

      confirmMenuDeletion(
        collaboratorMenu.row.id,
        `Deseja realmente excluir o usuario ${collaboratorMenu?.row?.nome || collaboratorMenu?.row?.email || ''}?`
      );
    },
    onEdit: () => openRecordEditor(collaboratorMenu),
    onResetPassword: () => {
      openPasswordReset(collaboratorMenu.row);
      closeMenu();
    },
    onUnlinkAll: () => {
      const confirmed = window.confirm(
        `Deseja realmente desvincular todos os ativos e linhas corporativas de ${collaboratorMenu?.row?.nome || 'este colaborador'}?`
      );
      if (confirmed) {
        unlinkAssignments(collaboratorMenu.row.id);
      }
      closeMenu();
    },
  };

  return {
    assetMenuHandlers,
    collaboratorCanUnlinkAll,
    collaboratorMenuHandlers,
    contactMenuHandlers,
    corporateLineMenuHandlers,
    infrastructureMenuHandlers,
  };
}
