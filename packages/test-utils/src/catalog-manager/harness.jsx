import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const deleteMutateMock = vi.fn();
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
      updateEmail: vi.fn(),
      unlinkAssignments: vi.fn(),
    },
    cargos: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    contatos: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    ativos: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    infra_estrutura: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    linhas_corporativas: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    termos_posse: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  },
}));

vi.mock('@/lib/systemAccessApi', () => ({
  systemAccessApi: {
    systems: {
      list: vi.fn(),
    },
    accesses: {
      list: vi.fn(),
    },
  },
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    canCentral: vi.fn(() => true),
    profile: { id: 'admin-1', funcao: 'admin', status: 'ativo' },
  }),
}));

vi.mock('@/components/CatalogEntityDialog', () => ({
  default: ({ fields, onOpenChange, onSubmit, open, record, title }) => {
    const React = require('react');
    const buildInitialValues = () =>
      Object.fromEntries(
        fields.map((field) => [
          field.key,
          record?.[field.key] !== undefined && record?.[field.key] !== null
            ? String(record[field.key])
            : field.defaultValue !== undefined
              ? String(field.defaultValue)
              : '',
        ])
      );

    const [values, setValues] = React.useState(() => buildInitialValues());
    const [validationMessage, setValidationMessage] = React.useState('');

    React.useEffect(() => {
      if (open) {
        setValues(buildInitialValues());
        setValidationMessage('');
      }
    }, [fields, open, record]);

    if (!open) return null;

    const handleSubmit = async (event) => {
      event.preventDefault();
      const missingField = fields.find((field) => field.required && !String(values[field.key] || '').trim());

      if (missingField) {
        const missingFieldLabel = typeof missingField.label === 'function' ? missingField.label(values) : missingField.label;
        setValidationMessage(`Preencha o campo obrigatorio: ${missingFieldLabel}.`);
        return;
      }

      const invalidField = fields.find((field) => field.validate && field.validate(values[field.key], values));

      if (invalidField) {
        setValidationMessage(invalidField.validate(values[invalidField.key], values));
        return;
      }

      const payload = Object.fromEntries(
        fields.map((field) => [
          field.key,
          field.valueType === 'boolean' ? values[field.key] === 'true' : values[field.key] === '' ? null : values[field.key],
        ])
      );

      try {
        await onSubmit(payload);
      } catch {
        // The page-level mutation already exposes user-facing feedback for failures.
      }
    };

    return (
      <form onSubmit={handleSubmit}>
        <h2>{title}</h2>
        {fields.map((field) => {
          const label = typeof field.label === 'function' ? field.label(values) : field.label;
          return (
            <label key={field.key}>
              {label}
              <input
                aria-label={label}
                value={values[field.key] || ''}
                onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              />
            </label>
          );
        })}
        {validationMessage ? <p>{validationMessage}</p> : null}
        <button type="button" onClick={() => onOpenChange(false)}>Cancelar</button>
        <button type="submit">Salvar</button>
      </form>
    );
  },
}));

vi.mock('@/components/ConfirmDeleteDialog', () => ({
  default: ({ description, onConfirm, open }) => {
    const React = require('react');
    const confirmedRef = React.useRef(false);

    React.useEffect(() => {
      if (!open) {
        confirmedRef.current = false;
        return;
      }

      if (confirmedRef.current) return;
      confirmedRef.current = true;
      const confirmMessage = String(description || '').replace(/^Essa acao nao pode ser desfeita\. /, '');
      if (open && window.confirm(confirmMessage)) {
        onConfirm?.();
      }
    }, [description, onConfirm, open]);

    return null;
  },
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
  default: ({ collaborators, onOpenChange, open }) =>
    open ? (
      <div>
        <h2>Vincular Usuario</h2>
        <button type="button" onClick={() => onOpenChange(false)}>Fechar vinculacao de ativo</button>
        <ul>
          {collaborators.map((item) => (
            <li key={item.id}>{item.nome || item.email || item.id}</li>
          ))}
        </ul>
      </div>
    ) : null,
}));
vi.mock('@/pages/catalog-manager/components/AssetsToolbar', () => ({ default: () => null }));
vi.mock('@/pages/catalog-manager/components/CollaboratorLinksDialog', () => ({ default: () => null }));
vi.mock('@/pages/catalog-manager/components/CollaboratorsToolbar', () => ({ default: () => null }));
vi.mock('@/pages/catalog-manager/components/CorporateLineAssignmentDialog', () => ({
  default: ({ collaborators, onOpenChange, open }) =>
    open ? (
      <div>
        <h2>Vincular Responsavel</h2>
        <button type="button" onClick={() => onOpenChange(false)}>Fechar vinculacao de linha</button>
        <ul>
          {collaborators.map((item) => (
            <li key={item.id}>{item.nome || item.email || item.id}</li>
          ))}
        </ul>
      </div>
    ) : null,
}));
vi.mock('@/pages/catalog-manager/components/InfrastructureImportDialog', () => ({ default: () => null }));
vi.mock('@/pages/catalog-manager/components/ContactsImportDialog', () => ({
  default: ({ onConfirm, onFileChange, onOpenChange, open, preview }) =>
    open ? (
      <div>
        <h2>Importar Contatos</h2>
        <input aria-label="Arquivo de importacao de contatos" type="file" onChange={onFileChange} />
        <div>{preview}</div>
        <button type="button" onClick={() => onOpenChange(false)}>Cancelar importacao de contatos</button>
        <button type="button" onClick={onConfirm}>Confirmar importacao de contatos</button>
      </div>
    ) : null,
}));
vi.mock('@/pages/catalog-manager/components/CorporateLinesImportDialog', () => ({
  default: ({ onConfirm, onFileChange, onOpenChange, open, preview }) =>
    open ? (
      <div>
        <h2>Importar Linhas Corporativas</h2>
        <input aria-label="Arquivo de importacao de linhas corporativas" type="file" onChange={onFileChange} />
        <div>{preview}</div>
        <button type="button" onClick={() => onOpenChange(false)}>Cancelar importacao de linhas</button>
        <button type="button" onClick={onConfirm}>Confirmar importacao de linhas corporativas</button>
      </div>
    ) : null,
}));
vi.mock('@/pages/catalog-manager/components/ImportPreviewTable', () => ({ default: () => null }));
vi.mock('@/pages/catalog-manager/components/EmailUpdateDialog', () => ({
  default: ({
    collaborator,
    form,
    isPending,
    onClose,
    onConfirmEmailChange,
    onEmailChange,
    onResetPasswordChange,
    onSubmit,
    open,
  }) =>
    open ? (
      <div>
        <h2>Atualizar email de acesso</h2>
        <p>{collaborator?.email}</p>
        <label>
          Novo email
          <input aria-label="Novo email" value={form.email} onChange={(event) => onEmailChange(event.target.value)} />
        </label>
        <label>
          Confirmar novo email
          <input
            aria-label="Confirmar novo email"
            value={form.confirmEmail}
            onChange={(event) => onConfirmEmailChange(event.target.value)}
          />
        </label>
        <label>
          Redefinir senha para Kmacom.123
          <input
            aria-label="Redefinir senha para Kmacom.123"
            type="checkbox"
            checked={form.resetPassword}
            onChange={(event) => onResetPasswordChange(event.target.checked)}
          />
        </label>
        <button type="button" onClick={onClose}>Cancelar atualizacao de email</button>
        <button type="button" onClick={onSubmit} disabled={isPending}>Atualizar email</button>
      </div>
    ) : null,
}));
vi.mock('@/pages/catalog-manager/components/PasswordResetDialog', () => ({ default: () => null }));
vi.mock('@/pages/catalog-manager/components/SearchToolbar', () => ({ default: () => null }));

vi.mock('@/pages/catalog-manager/components/AssetsImportDialog', () => ({
  default: ({ onConfirm, onFileChange, onOpenChange, open, preview }) =>
    open ? (
      <div>
        <h2>Importar Ativos</h2>
        <input aria-label="Arquivo de importacao de ativos" type="file" onChange={onFileChange} />
        <div>{preview}</div>
        <button type="button" onClick={() => onOpenChange(false)}>Cancelar importacao</button>
        <button type="button" onClick={onConfirm}>Confirmar importacao</button>
      </div>
    ) : null,
}));

vi.mock('@/pages/catalog-manager/components/CollaboratorsImportDialog', () => ({
  default: ({ onConfirm, onFileChange, onOpenChange, open, preview }) =>
    open ? (
      <div>
        <h2>Importar Colaboradores</h2>
        <input aria-label="Arquivo de importacao de colaboradores" type="file" onChange={onFileChange} />
        <div>{preview}</div>
        <button type="button" onClick={() => onOpenChange(false)}>Cancelar importacao de colaboradores</button>
        <button type="button" onClick={onConfirm}>Confirmar importacao de colaboradores</button>
      </div>
    ) : null,
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

vi.mock('@/pages/catalog-manager/components/ContactActionsMenu', () => ({
  default: ({ menu, onDelete, onEdit }) =>
    menu ? (
      <div>
        <button type="button" onClick={onEdit}>Editar</button>
        <button type="button" onClick={onDelete}>Excluir</button>
      </div>
    ) : null,
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

vi.mock('@/pages/catalog-manager/components/InfrastructureActionsMenu', () => ({
  default: ({ menu, onDelete, onEdit }) =>
    menu ? (
      <div>
        <button type="button" onClick={onEdit}>Editar</button>
        <button type="button" onClick={onDelete}>Excluir</button>
      </div>
    ) : null,
}));

vi.mock('@/pages/catalog-manager/components/CollaboratorActionsMenu', () => ({
  default: ({ canUnlinkAll, menu, onDelete, onEdit, onResetPassword, onUpdateEmail, onUnlinkAll }) =>
    menu ? (
      <div>
        <button type="button" onClick={onEdit}>Editar</button>
        <button type="button" onClick={onUpdateEmail}>Atualizar email de acesso</button>
        <button type="button" onClick={onResetPassword}>Redefinir senha</button>
        {canUnlinkAll ? <button type="button" onClick={onUnlinkAll}>Desvincular tudo</button> : null}
        <button type="button" onClick={onDelete}>Excluir</button>
      </div>
    ) : null,
}));

vi.mock('@/pages/catalog-manager/components/CatalogHeader', () => ({
  default: ({ lockedEntityKey, onImportAssets, onImportCollaborators, onImportContacts, onImportCorporateLines, onNewRecord, singularLabel, title }) => (
    <div>
      <div>{title}</div>
      {lockedEntityKey === 'ativos' ? <button type="button" onClick={onImportAssets}>Importar ativos</button> : null}
      {lockedEntityKey === 'colaboradores' ? <button type="button" onClick={onImportCollaborators}>Importar colaboradores</button> : null}
      {lockedEntityKey === 'contatos' ? <button type="button" onClick={onImportContacts}>Importar contatos</button> : null}
      {lockedEntityKey === 'linhas_corporativas' ? <button type="button" onClick={onImportCorporateLines}>Importar linhas corporativas</button> : null}
      <button type="button" onClick={onNewRecord}>{`Novo ${singularLabel}`}</button>
    </div>
  ),
}));

vi.mock('@/pages/catalog-manager/components/CatalogTableShell', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/pages/catalog-manager/components/MenuTriggerButton', () => ({
  default: ({ onClick }) => (
    <button type="button" aria-label="Abrir menu de acoes" onClick={onClick}>
      Abrir menu
    </button>
  ),
}));

vi.mock('@/pages/catalog-manager/utils/importExportHelpers', () => ({
  downloadAssetsJsonTemplate: vi.fn(),
  downloadAssetsTemplate: vi.fn(),
  downloadCollaboratorsJsonTemplate: vi.fn(),
  downloadCollaboratorsTemplate: vi.fn(),
  downloadContactsJsonTemplate: vi.fn(),
  downloadContactsTemplate: vi.fn(),
  downloadCorporateLinesJsonTemplate: vi.fn(),
  downloadCorporateLinesTemplate: vi.fn(),
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

const { default: CatalogManager } = await import('@/pages/CatalogManager');
const { catalogApi } = await import('@/lib/catalogApi');
const { systemAccessApi } = await import('@/lib/systemAccessApi');
const { readImportFileRows } = await import('@/pages/catalog-manager/utils/importParsers');

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function renderCatalogManager(lockedEntityKey) {
  const queryClient = createQueryClient();
  vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(invalidateQueriesMock);

  return render(
    <QueryClientProvider client={queryClient}>
      <CatalogManager lockedEntityKey={lockedEntityKey} />
    </QueryClientProvider>
  );
}

export function resetCatalogManagerMocks() {
  vi.clearAllMocks();
  window.confirm = vi.fn();

  catalogApi.departamentos.list.mockResolvedValue([{ id: 'dep-1', nome: 'Tecnologia' }]);
  catalogApi.unidades.list.mockResolvedValue([{ id: 'unit-1', nome: 'Matriz', ativo: true }]);
  catalogApi.colaboradores.list.mockResolvedValue([{ id: 'col-1', nome: 'Joao', email: 'joao@macom.com' }]);
  catalogApi.cargos.list.mockResolvedValue([]);
  catalogApi.contatos.list.mockResolvedValue([]);
  catalogApi.contatos.create.mockResolvedValue({ id: 'contact-created' });
  catalogApi.contatos.remove.mockResolvedValue(true);
  catalogApi.infra_estrutura.list.mockResolvedValue([]);
  catalogApi.infra_estrutura.create.mockResolvedValue({ id: 'infra-created' });
  catalogApi.infra_estrutura.remove.mockResolvedValue(true);
  catalogApi.linhas_corporativas.list.mockResolvedValue([]);
  catalogApi.linhas_corporativas.create.mockResolvedValue({ id: 'line-created' });
  catalogApi.linhas_corporativas.remove.mockResolvedValue(true);
  catalogApi.termos_posse.list.mockResolvedValue([]);
  catalogApi.ativos.remove.mockImplementation(deleteMutateMock);
  catalogApi.ativos.create.mockResolvedValue({ id: 'asset-created' });
  catalogApi.ativos.update.mockResolvedValue({ id: 'asset-updated' });
  catalogApi.colaboradores.create.mockResolvedValue({ id: 'col-created' });
  catalogApi.colaboradores.update.mockResolvedValue({ id: 'col-updated' });
  catalogApi.colaboradores.updateEmail.mockResolvedValue({ id: 'col-updated', email: 'novo@macom.com' });
  catalogApi.colaboradores.remove.mockResolvedValue(true);
  catalogApi.colaboradores.unlinkAssignments.mockResolvedValue({
    ativos_count: 1,
    linhas_count: 1,
    sistemas_count: 1,
    total_count: 3,
  });
  systemAccessApi.systems.list.mockResolvedValue([
    { id: 'system-central', slug: 'central', nome: 'Central', ativo: true },
    { id: 'system-reports', slug: 'relatorios', nome: 'Relatorios', ativo: true },
  ]);
  systemAccessApi.accesses.list.mockResolvedValue([]);
  readImportFileRows.mockReset();
}

export { catalogApi, readImportFileRows, systemAccessApi };
