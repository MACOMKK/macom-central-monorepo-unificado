import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AssetActionsMenu from '@/pages/catalog-manager/components/AssetActionsMenu';

describe('AssetActionsMenu', () => {
  const menu = { row: { id: 1 }, top: 20, right: 12 };

  it('nao renderiza quando o menu estiver fechado', () => {
    const { container } = render(
      <AssetActionsMenu
        menu={null}
        onAssign={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza as acoes e executa os callbacks', async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn();
    const onDelete = vi.fn();
    const onEdit = vi.fn();

    render(
      <AssetActionsMenu
        menu={menu}
        onAssign={onAssign}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Vincular colaborador' }));
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onAssign).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
