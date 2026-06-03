export function useCatalogActionHandlers({
  assetMenu,
  assets,
  closeMenu,
  canManageElevatedRoles = true,
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
  requestConfirmation,
  systemAccesses,
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

  const confirmMenuDeletion = (rowId, title, description) => {
    requestConfirmation({
      title,
      description,
      onConfirm: () => runWithClosedMenu(() => deleteRecord(rowId)),
    });
    closeMenu();
  };

  const openMenuAssignment = (openAssignment, menu) => {
    openAssignment(menu.row);
    closeMenu();
  };

  const hasLinkedCollaboratorItems = (collaboratorId) =>
    assets.some((asset) => asset.usuario_id === collaboratorId) ||
    corporateLines.some((line) => line.colaborador_id === collaboratorId) ||
    systemAccesses.some((access) => access.colaborador_id === collaboratorId);

  const collaboratorCanUnlinkAll = Boolean(
    collaboratorMenu &&
      collaboratorMenu.row.status === 'inativo' &&
      hasLinkedCollaboratorItems(collaboratorMenu.row.id)
  );
  const collaboratorCanDelete = Boolean(
    collaboratorMenu &&
      (canManageElevatedRoles || !['admin', 'gestor'].includes(collaboratorMenu.row.funcao))
  );
  const collaboratorCanResetPassword = Boolean(
    collaboratorMenu &&
      (canManageElevatedRoles || collaboratorMenu.row.funcao !== 'admin')
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
        'Excluir ativo',
        `Essa acao nao pode ser desfeita. Deseja excluir ${assetMenu?.row?.nome || assetMenu?.row?.patrimonio || 'este ativo'}?`
      );
    },
    onEdit: () => openRecordEditor(assetMenu),
  };

  const contactMenuHandlers = {
    onDelete: () => {
      confirmMenuDeletion(
        contactMenu.row.id,
        'Excluir contato',
        `Essa acao nao pode ser desfeita. Deseja excluir ${contactMenu?.row?.nome || 'este contato'}?`
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
        'Excluir linha corporativa',
        `Essa acao nao pode ser desfeita. Deseja excluir ${corporateLineMenu?.row?.nome || corporateLineMenu?.row?.numero || 'esta linha corporativa'}?`
      );
    },
    onEdit: () => openRecordEditor(corporateLineMenu),
  };

  const infrastructureMenuHandlers = {
    onDelete: () => {
      confirmMenuDeletion(
        infrastructureMenu.row.id,
        'Excluir registro de infraestrutura',
        `Essa acao nao pode ser desfeita. Deseja excluir ${infrastructureMenu?.row?.nome || 'este registro de infraestrutura'}?`
      );
    },
    onEdit: () => openRecordEditor(infrastructureMenu),
  };

  const collaboratorMenuHandlers = {
    onDelete: () => {
      if (!collaboratorCanDelete) {
        showMenuError('Apenas administradores podem excluir colaboradores admin ou gestor.');
        return;
      }

      if (hasLinkedCollaboratorItems(collaboratorMenu?.row?.id)) {
        showMenuError('Nao e permitido excluir um colaborador com itens vinculados.');
        return;
      }

      confirmMenuDeletion(
        collaboratorMenu.row.id,
        'Excluir colaborador',
        `Essa acao nao pode ser desfeita. Deseja excluir o usuario ${collaboratorMenu?.row?.nome || collaboratorMenu?.row?.email || ''}?`
      );
    },
    onEdit: () => openRecordEditor(collaboratorMenu),
    onResetPassword: () => {
      if (!collaboratorCanResetPassword) {
        showMenuError('Apenas administradores podem redefinir senha de colaboradores admin.');
        return;
      }

      openPasswordReset(collaboratorMenu.row);
      closeMenu();
    },
    onUnlinkAll: () => {
      requestConfirmation({
        title: 'Desvincular colaborador',
        description: `Deseja realmente desvincular todos os ativos, linhas corporativas e sistemas de ${collaboratorMenu?.row?.nome || 'este colaborador'}?`,
        confirmLabel: 'Desvincular',
        onConfirm: () => unlinkAssignments(collaboratorMenu.row.id),
      });
      closeMenu();
    },
  };

  return {
    assetMenuHandlers,
    collaboratorCanDelete,
    collaboratorCanResetPassword,
    collaboratorCanUnlinkAll,
    collaboratorMenuHandlers,
    contactMenuHandlers,
    corporateLineMenuHandlers,
    infrastructureMenuHandlers,
  };
}
