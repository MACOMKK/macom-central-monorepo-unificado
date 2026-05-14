import { render, screen } from '@testing-library/react';

const useAuthMock = vi.fn();

vi.mock('@/lib/AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => useAuthMock(),
}));

vi.mock('@/components/ProtectedRoute', () => ({
  default: () => <div>ProtectedRoute marker</div>,
}));

vi.mock('@/components/layout/AppLayout', () => ({
  default: () => <div>AppLayout marker</div>,
}));

vi.mock('@/pages/Assets', () => ({
  default: () => <div>Assets page</div>,
}));

vi.mock('@/pages/Collaborators', () => ({
  default: () => <div>Collaborators page</div>,
}));

vi.mock('@/pages/Contacts', () => ({
  default: () => <div>Contacts page</div>,
}));

vi.mock('@/pages/CorporateLines', () => ({
  default: () => <div>CorporateLines page</div>,
}));

vi.mock('@/pages/Dashboard', () => ({
  default: () => <div>Dashboard page</div>,
}));

vi.mock('@/pages/Departments', () => ({
  default: () => <div>Departments page</div>,
}));

vi.mock('@/pages/Infrastructure', () => ({
  default: () => <div>Infrastructure page</div>,
}));

vi.mock('@/pages/Login', () => ({
  default: ({ defaultEmail, loading }) => (
    <div>{`Login page:${defaultEmail}:${loading ? 'loading' : 'idle'}`}</div>
  ),
}));

vi.mock('@/pages/TermsPossession', () => ({
  default: () => <div>TermsPossession page</div>,
}));

vi.mock('@/pages/Units', () => ({
  default: () => <div>Units page</div>,
}));

import App from '@/App';

describe('App routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza a rota de login com o email padrao quando a sessao ainda esta carregando', async () => {
    window.history.pushState({}, '', '/login');
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      login: vi.fn(),
    });

    render(<App />);

    expect(await screen.findByText('Login page:kevinkleymacom@gmail.com:loading')).toBeInTheDocument();
  });

  it('renderiza a rota de login em estado normal quando o usuario nao esta autenticado', async () => {
    window.history.pushState({}, '', '/login');
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      login: vi.fn(),
    });

    render(<App />);

    expect(await screen.findByText('Login page:kevinkleymacom@gmail.com:idle')).toBeInTheDocument();
  });

  it('renderiza a arvore protegida para rotas autenticadas', () => {
    window.history.pushState({}, '', '/ativos');
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText('ProtectedRoute marker')).toBeInTheDocument();
  });
});
