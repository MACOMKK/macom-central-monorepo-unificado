import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthProvider, useAuth } from '@macom/auth';

const signInWithPasswordMock = vi.fn();
const signOutMock = vi.fn();
const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const authMeMock = vi.fn();

vi.mock('@macom/api-client/catalogApi', () => ({
  catalogApi: {
    auth: {
      me: (...args) => authMeMock(...args),
    },
  },
}));

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
    authMeMock.mockReset();

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

    authMeMock.mockResolvedValue({
      row: {
        id: 'user-1',
        nome: 'Administrador',
        email: 'admin@macom.com',
        funcao: 'admin',
        status: 'ativo',
      },
      access: null,
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(authMeMock).toHaveBeenCalledWith('token-admin');
      expect(screen.getByText('autenticado')).toBeInTheDocument();
      expect(screen.getByText('Administrador')).toBeInTheDocument();
    });
  });
});
