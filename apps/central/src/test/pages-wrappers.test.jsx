import { render, screen } from '@testing-library/react';

const catalogManagerMock = vi.fn(({ lockedEntityKey }) => <div>{`CatalogManager:${lockedEntityKey}`}</div>);

vi.mock('@/pages/CatalogManager', () => ({
  default: (props) => catalogManagerMock(props),
}));

import Assets from '@/pages/Assets';
import Collaborators from '@/pages/Collaborators';
import Contacts from '@/pages/Contacts';
import CorporateLines from '@/pages/CorporateLines';
import Departments from '@/pages/Departments';
import Infrastructure from '@/pages/Infrastructure';
import Units from '@/pages/Units';

describe('Catalog page wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['Assets', Assets, 'ativos'],
    ['Collaborators', Collaborators, 'colaboradores'],
    ['Contacts', Contacts, 'contatos'],
    ['CorporateLines', CorporateLines, 'linhas_corporativas'],
    ['Departments', Departments, 'departamentos'],
    ['Infrastructure', Infrastructure, 'infra_estrutura'],
    ['Units', Units, 'unidades'],
  ])('renderiza %s com o lockedEntityKey correto', (_label, Component, lockedEntityKey) => {
    render(<Component />);

    expect(screen.getByText(`CatalogManager:${lockedEntityKey}`)).toBeInTheDocument();
    expect(catalogManagerMock).toHaveBeenCalledWith(expect.objectContaining({ lockedEntityKey }));
  });
});
