import { render, screen } from '@testing-library/react';

const useAuthMock = vi.fn();

vi.mock('@macom/auth', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  ProtectedRoute: () => <div>ProtectedRoute marker</div>,
  useAuth: () => useAuthMock(),
}));

vi.mock('@macom/ui', () => ({
  NotFoundPage: ({ title }) => <div>{title}</div>,
}));

vi.mock('@/components/ConsoleLayout', () => ({
  default: () => <div>ConsoleLayout marker</div>,
}));

vi.mock('../Login', () => ({
  default: ({ loading }) => <div>{`Login page:${loading ? 'loading' : 'idle'}`}</div>,
}));

import App from '@/App';

describe('App routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza a rota de login quando o usuario nao esta autenticado', async () => {
    window.history.pushState({}, '', '/login');
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      login: vi.fn(),
    });

    render(<App />);

    expect(await screen.findByText('Login page:idle')).toBeInTheDocument();
  });

  it('renderiza a arvore protegida para rotas autenticadas', async () => {
    window.history.pushState({}, '', '/');
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
    });

    render(<App />);

    expect(await screen.findByText('ProtectedRoute marker')).toBeInTheDocument();
  });

  it('renderiza a pagina 404 para rotas desconhecidas', async () => {
    window.history.pushState({}, '', '/rota-inexistente');
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      login: vi.fn(),
    });

    render(<App />);

    expect(await screen.findByText('Area nao encontrada')).toBeInTheDocument();
  });
});
