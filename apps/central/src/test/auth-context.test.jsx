import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthProvider, useAuth } from '@macom/auth';

const signInWithPasswordMock = vi.fn();
const signOutMock = vi.fn();
const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('@macom/api-client/supabaseClient', () => ({
  assertSupabaseConfigured: vi.fn(),
  supabase: {
    auth: {
      signInWithPassword: (...args) => signInWithPasswordMock(...args),
      signOut: (...args) => signOutMock(...args),
      getSession: (...args) => getSessionMock(...args),
      onAuthStateChange: (...args) => onAuthStateChangeMock(...args),
    },
  },
}));

function Harness() {
  const { login, profile, isAuthenticated, loading } = useAuth();

  return (
    <div>
      <button type="button" onClick={() => login('admin@macom.com', 'Segredo123')}>
        Entrar
      </button>
      <div>{loading ? 'carregando' : 'pronto'}</div>
      <div>{isAuthenticated ? 'autenticado' : 'anonimo'}</div>
      <div>{profile?.nome || 'sem-perfil'}</div>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    signInWithPasswordMock.mockReset();
    signOutMock.mockReset();
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock;

    signOutMock.mockResolvedValue({ error: null });
    getSessionMock.mockResolvedValue({ data: { session: null } });
    onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
  });

  it('usa auth.me().row para validar o admin logado', async () => {
    const user = userEvent.setup();

    signInWithPasswordMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-admin',
          user: { id: 'user-1', email: 'admin@macom.com' },
        },
      },
      error: null,
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        row: {
          id: 'user-1',
          nome: 'Administrador',
          email: 'admin@macom.com',
          funcao: 'admin',
          status: 'ativo',
        },
        access: null,
      }),
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/central-api'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token-admin',
          }),
        }),
      );
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
        action: 'me',
        entity: 'colaboradores',
        system_slug: 'central',
      });
      expect(screen.getByText('autenticado')).toBeInTheDocument();
      expect(screen.getByText('Administrador')).toBeInTheDocument();
    });
  });

  it('permite configurar o system_slug para novos apps', async () => {
    const user = userEvent.setup();

    signInWithPasswordMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-console',
          user: { id: 'user-3', email: 'admin@macom.com' },
        },
      },
      error: null,
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        row: {
          id: 'user-3',
          nome: 'Administrador Console',
          email: 'admin@macom.com',
          funcao: 'admin',
          status: 'ativo',
        },
        access: null,
      }),
    });

    render(
      <AuthProvider systemSlug="console">
        <Harness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
        system_slug: 'console',
      });
      expect(screen.getByText('autenticado')).toBeInTheDocument();
      expect(screen.getByText('Administrador Console')).toBeInTheDocument();
    });
  });

  it('permite acesso ao gestor logado', async () => {
    const user = userEvent.setup();

    signInWithPasswordMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-gestor',
          user: { id: 'user-2', email: 'gestor@macom.com' },
        },
      },
      error: null,
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        row: {
          id: 'user-2',
          nome: 'Gestor Central',
          email: 'gestor@macom.com',
          funcao: 'gestor',
          status: 'ativo',
        },
        access: null,
      }),
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/central-api'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token-gestor',
          }),
        }),
      );
      expect(screen.getByText('autenticado')).toBeInTheDocument();
      expect(screen.getByText('Gestor Central')).toBeInTheDocument();
    });
  });
});
