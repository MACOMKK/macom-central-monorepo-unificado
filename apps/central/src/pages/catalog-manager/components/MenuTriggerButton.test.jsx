import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MenuTriggerButton from '@/pages/catalog-manager/components/MenuTriggerButton';

describe('MenuTriggerButton', () => {
  it('dispara o callback ao clicar no botao', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<MenuTriggerButton onClick={handleClick} />);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
