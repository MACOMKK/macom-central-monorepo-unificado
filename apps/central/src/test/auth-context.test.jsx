import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

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

function ErrorHarness() {
  const { login, isAuthenticated } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');

  return (
    <div>
      <button
        type="button"
        onClick={() => login('admin@macom.com', 'Segredo123').catch((error) => setErrorMessage(error.message))}
      >
        Entrar
      </button>
      <div>{isAuthenticated ? 'autenticado' : 'anonimo'}</div>
      <div>{errorMessage || 'sem-erro'}</div>
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
        access: { id: 'access-1', nivel_acesso: 'admin', ativo: true },
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
        access: { id: 'access-3', nivel_acesso: 'admin', ativo: true },
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

  it('permite configurar a function de autenticacao para o Console', async () => {
    const user = userEvent.setup();

    signInWithPasswordMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-console-api',
          user: { id: 'user-4', email: 'console@macom.com' },
        },
      },
      error: null,
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        row: {
          id: 'user-4',
          nome: 'Admin Console API',
          email: 'console@macom.com',
          funcao: 'admin',
          status: 'ativo',
        },
        access: { id: 'access-4', nivel_acesso: 'admin', ativo: true },
      }),
    });

    render(
      <AuthProvider authFunctionName="plataforma-api" systemSlug="central">
        <Harness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/plataforma-api'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token-console-api',
          }),
        }),
      );
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
        action: 'me',
        entity: 'colaboradores',
        system_slug: 'central',
      });
      expect(screen.getByText('autenticado')).toBeInTheDocument();
      expect(screen.getByText('Admin Console API')).toBeInTheDocument();
    });
  });

  it('nao encerra a sessao do Supabase quando a validacao falha por erro transiente', async () => {
    const user = userEvent.setup();

    signInWithPasswordMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-error',
          user: { id: 'user-error', email: 'admin@macom.com' },
        },
      },
      error: null,
    });

    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: 'Falha temporaria na API.',
      }),
    });

    render(
      <AuthProvider authFunctionName="plataforma-api">
        <ErrorHarness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/plataforma-api'),
        expect.any(Object),
      );
      expect(signOutMock).not.toHaveBeenCalled();
      expect(screen.getByText('anonimo')).toBeInTheDocument();
      expect(screen.getByText('Falha temporaria na API.')).toBeInTheDocument();
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
        access: { id: 'access-2', nivel_acesso: 'gestor', ativo: true },
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

  it('permite acesso via fallback de funcao quando allowFunctionFallback esta ativo (padrao, usado pelo Console)', async () => {
    const user = userEvent.setup();

    signInWithPasswordMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-fallback-funcao',
          user: { id: 'user-5', email: 'funcao-apenas@macom.com' },
        },
      },
      error: null,
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        row: {
          id: 'user-5',
          nome: 'Gestor Por Funcao',
          email: 'funcao-apenas@macom.com',
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
      expect(screen.getByText('autenticado')).toBeInTheDocument();
      expect(screen.getByText('Gestor Por Funcao')).toBeInTheDocument();
    });
  });

  it('nega acesso ao Console (allowFunctionFallback=true) quando funcao=usuario, mesmo com grant explicito ativo em acessos_usuario_sistema', async () => {
    const user = userEvent.setup();

    signInWithPasswordMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-grant-nao-deve-valer-no-console',
          user: { id: 'user-7', email: 'usuario-com-grant@macom.com' },
        },
      },
      error: null,
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        row: {
          id: 'user-7',
          nome: 'Usuario Com Grant De Central',
          email: 'usuario-com-grant@macom.com',
          funcao: 'usuario',
          status: 'ativo',
        },
        access: { id: 'access-7', nivel_acesso: 'admin', ativo: true },
      }),
    });

    render(
      <AuthProvider>
        <ErrorHarness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByText('anonimo')).toBeInTheDocument();
      expect(screen.getByText('Acesso restrito a administradores e gestores.')).toBeInTheDocument();
    });
  });

  it('nega acesso quando allowFunctionFallback=false (Central) e ha apenas funcao, sem grant explicito ativo', async () => {
    const user = userEvent.setup();

    signInWithPasswordMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-sem-acesso',
          user: { id: 'user-6', email: 'sem-acesso@macom.com' },
        },
      },
      error: null,
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        row: {
          id: 'user-6',
          nome: 'Sem Acesso Explicito',
          email: 'sem-acesso@macom.com',
          funcao: 'gestor',
          status: 'ativo',
        },
        access: null,
      }),
    });

    render(
      <AuthProvider allowFunctionFallback={false}>
        <ErrorHarness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalled();
      expect(screen.getByText('anonimo')).toBeInTheDocument();
      expect(screen.getByText('Acesso restrito a administradores e gestores.')).toBeInTheDocument();
    });
  });
});
