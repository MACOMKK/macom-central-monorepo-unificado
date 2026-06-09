import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CollaboratorActionsMenu from '@/pages/catalog-manager/components/CollaboratorActionsMenu';

describe('CollaboratorActionsMenu', () => {
  const menu = { row: { id: 7 }, top: 24, right: 18 };

  it('esconde a opcao de desvincular quando nao aplicavel', () => {
    render(
      <CollaboratorActionsMenu
        canUnlinkAll={false}
        isUnlinking={false}
        menu={menu}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onUpdateEmail={vi.fn()}
        onResetPassword={vi.fn()}
        onUnlinkAll={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Desvincular tudo' })).not.toBeInTheDocument();
  });

  it('renderiza as acoes e respeita o estado de desvinculacao', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const onResetPassword = vi.fn();
    const onUpdateEmail = vi.fn();
    const onUnlinkAll = vi.fn();

    const { rerender } = render(
      <CollaboratorActionsMenu
        canUnlinkAll
        isUnlinking={false}
        menu={menu}
        onDelete={onDelete}
        onEdit={onEdit}
        onUpdateEmail={onUpdateEmail}
        onResetPassword={onResetPassword}
        onUnlinkAll={onUnlinkAll}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Atualizar email de acesso' }));
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));
    await user.click(screen.getByRole('button', { name: 'Desvincular tudo' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onUpdateEmail).toHaveBeenCalledTimes(1);
    expect(onResetPassword).toHaveBeenCalledTimes(1);
    expect(onUnlinkAll).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);

    rerender(
      <CollaboratorActionsMenu
        canUnlinkAll
        isUnlinking
        menu={menu}
        onDelete={onDelete}
        onEdit={onEdit}
        onUpdateEmail={onUpdateEmail}
        onResetPassword={onResetPassword}
        onUnlinkAll={onUnlinkAll}
      />
    );

    expect(screen.getByRole('button', { name: 'Desvincular tudo' })).toBeDisabled();
  });
});
