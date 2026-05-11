import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import CatalogManager from '@/pages/CatalogManager';
import { catalogApi } from '@/lib/catalogApi';

const deleteMutateMock = vi.fn();
const invalidateQueriesMock = vi.fn();

vi.mock('@/lib/catalogApi', () => ({
  catalogApi: {
    departamentos: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    unidades: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    colaboradores: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      updatePassword: vi.fn(),
      unlinkAssignments: vi.fn(),
    },
    contatos: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    ativos: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    infra_estrutura: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    linhas_corporativas: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    termos_posse: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  },
}));

vi.mock('@/components/CatalogEntityDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type = 'button', ...props }) => (
    <button type={type} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }) => <div>{children}</div>,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogFooter: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/feedback-toast', () => ({
  default: ({ feedback }) => (feedback ? <div role="alert">{feedback.message}</div> : null),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props) => <input {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }) => <div>{children}</div>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children, value }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/table', () => ({
  TableCell: ({ children, ...props }) => <td {...props}>{children}</td>,
  TableRow: ({ children, ...props }) => <tr {...props}>{children}</tr>,
}));

vi.mock('@/pages/catalog-manager/components/AssetAssignmentDialog', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/components/AssetsImportDialog', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/components/AssetsToolbar', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/components/AssetActionsMenu', () => ({
  default: ({ menu, onAssign, onDelete, onEdit }) =>
    menu ? (
      <div>
        <button type="button" onClick={onAssign}>Vincular colaborador</button>
        <button type="button" onClick={onEdit}>Editar</button>
        <button type="button" onClick={onDelete}>Excluir</button>
      </div>
    ) : null,
}));

vi.mock('@/pages/catalog-manager/components/CatalogHeader', () => ({
  default: ({ title }) => <div>{title}</div>,
}));

vi.mock('@/pages/catalog-manager/components/CatalogTableShell', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/pages/catalog-manager/components/CollaboratorLinksDialog', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/components/CollaboratorsImportDialog', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/components/CollaboratorsToolbar', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/components/ContactActionsMenu', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/components/CorporateLineActionsMenu', () => ({
  default: ({ menu, onAssign, onDelete, onEdit }) =>
    menu ? (
      <div>
        <button type="button" onClick={onAssign}>Vincular colaborador</button>
        <button type="button" onClick={onEdit}>Editar</button>
        <button type="button" onClick={onDelete}>Excluir</button>
      </div>
    ) : null,
}));

vi.mock('@/pages/catalog-manager/components/CorporateLineAssignmentDialog', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/components/InfrastructureActionsMenu', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/components/InfrastructureImportDialog', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/components/ImportPreviewTable', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/components/MenuTriggerButton', () => ({
  default: ({ onClick }) => (
    <button type="button" aria-label="Abrir menu de acoes" onClick={onClick}>
      Abrir menu
    </button>
  ),
}));

vi.mock('@/pages/catalog-manager/components/PasswordResetDialog', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/components/CollaboratorActionsMenu', () => ({
  default: ({ canUnlinkAll, menu, onDelete, onEdit, onResetPassword, onUnlinkAll }) =>
    menu ? (
      <div>
        <button type="button" onClick={onEdit}>Editar</button>
        <button type="button" onClick={onResetPassword}>Redefinir senha</button>
        {canUnlinkAll ? (
          <button type="button" onClick={onUnlinkAll}>Desvincular tudo</button>
        ) : null}
        <button type="button" onClick={onDelete}>Excluir</button>
      </div>
    ) : null,
}));

vi.mock('@/pages/catalog-manager/components/SearchToolbar', () => ({
  default: () => null,
}));

vi.mock('@/pages/catalog-manager/utils/importExportHelpers', () => ({
  downloadAssetsJsonTemplate: vi.fn(),
  downloadAssetsTemplate: vi.fn(),
  downloadCollaboratorsJsonTemplate: vi.fn(),
  downloadCollaboratorsTemplate: vi.fn(),
  downloadInfrastructureJsonTemplate: vi.fn(),
  downloadInfrastructureTemplate: vi.fn(),
  exportAssetsCsv: vi.fn(),
  exportCollaboratorsCsv: vi.fn(),
  getImportTemplateExamples: vi.fn(() => []),
}));

vi.mock('@/pages/catalog-manager/utils/importInfrastructureRows', () => ({
  importInfrastructureRows: vi.fn(),
}));

vi.mock('@/pages/catalog-manager/utils/importParsers', () => ({
  readImportFileRows: vi.fn(),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderCatalogManager(lockedEntityKey) {
  const queryClient = createQueryClient();
  vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(invalidateQueriesMock);

  return render(
    <QueryClientProvider client={queryClient}>
      <CatalogManager lockedEntityKey={lockedEntityKey} />
    </QueryClientProvider>
  );
}

describe('CatalogManager action menus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn();

    catalogApi.departamentos.list.mockResolvedValue([]);
    catalogApi.unidades.list.mockResolvedValue([{ id: 'unit-1', nome: 'Matriz', ativo: true }]);
    catalogApi.colaboradores.list.mockResolvedValue([{ id: 'col-1', nome: 'Joao', email: 'joao@macom.com' }]);
    catalogApi.contatos.list.mockResolvedValue([]);
    catalogApi.infra_estrutura.list.mockResolvedValue([]);
    catalogApi.linhas_corporativas.list.mockResolvedValue([]);
    catalogApi.linhas_corporativas.remove.mockResolvedValue(true);
    catalogApi.termos_posse.list.mockResolvedValue([]);
    catalogApi.ativos.remove.mockImplementation(deleteMutateMock);
    catalogApi.colaboradores.remove.mockResolvedValue(true);
    catalogApi.colaboradores.unlinkAssignments.mockResolvedValue({
      ativos_count: 1,
      linhas_count: 1,
      total_count: 2,
    });
  });

  it('abre e fecha o menu de acoes de ativos', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-1',
        nome: 'Notebook Dell',
        categoria: 'Notebook',
        numero_serie: 'SN-001',
        patrimonio: 'PAT-001',
        unidade_id: 'unit-1',
        status: 'disponivel',
      },
    ]);

    renderCatalogManager('ativos');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);

    expect(screen.getByRole('button', { name: 'Vincular colaborador' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('button', { name: 'Vincular colaborador' })).not.toBeInTheDocument();
  });

  it('bloqueia exclusao de ativo vinculado e exibe feedback', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-2',
        nome: 'MacBook Pro',
        categoria: 'Notebook',
        numero_serie: 'SN-002',
        patrimonio: 'PAT-002',
        unidade_id: 'unit-1',
        usuario_id: 'col-1',
        status: 'em_uso',
      },
    ]);

    renderCatalogManager('ativos');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Nao e permitido excluir um ativo com usuario vinculado.');
    expect(deleteMutateMock).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('bloqueia exclusao de colaborador com itens vinculados', async () => {
    const user = userEvent.setup();
    catalogApi.colaboradores.list.mockResolvedValue([
      {
        id: 'col-1',
        nome: 'Joao',
        email: 'joao@macom.com',
        status: 'ativo',
      },
    ]);
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-1',
        nome: 'Notebook Dell',
        categoria: 'Notebook',
        numero_serie: 'SN-001',
        patrimonio: 'PAT-001',
        unidade_id: 'unit-1',
        usuario_id: 'col-1',
        status: 'em_uso',
      },
    ]);

    renderCatalogManager('colaboradores');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Nao e permitido excluir um colaborador com itens vinculados.');
    expect(catalogApi.colaboradores.remove).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('exibe a acao de desvincular tudo para colaborador inativo com itens vinculados', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true);
    catalogApi.colaboradores.list.mockResolvedValue([
      {
        id: 'col-1',
        nome: 'Joao',
        email: 'joao@macom.com',
        status: 'inativo',
      },
    ]);
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-1',
        nome: 'Notebook Dell',
        categoria: 'Notebook',
        numero_serie: 'SN-001',
        patrimonio: 'PAT-001',
        unidade_id: 'unit-1',
        usuario_id: 'col-1',
        status: 'em_uso',
      },
    ]);
    catalogApi.linhas_corporativas.list.mockResolvedValue([
      {
        id: 'line-1',
        numero: '85999999999',
        colaborador_id: 'col-1',
      },
    ]);

    renderCatalogManager('colaboradores');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);

    const unlinkButton = screen.getByRole('button', { name: 'Desvincular tudo' });
    expect(unlinkButton).toBeInTheDocument();

    await user.click(unlinkButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(catalogApi.colaboradores.unlinkAssignments).toHaveBeenCalledWith('col-1');
  });

  it('bloqueia exclusao de linha corporativa vinculada', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.linhas_corporativas.list.mockResolvedValue([
      {
        id: 'line-1',
        numero: '85999999999',
        nome: 'Linha Comercial',
        operadora: 'Claro',
        colaborador_id: 'col-1',
      },
    ]);

    renderCatalogManager('linhas_corporativas');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Nao e permitido excluir uma linha corporativa com colaborador vinculado.');
    expect(catalogApi.linhas_corporativas.remove).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });
});
