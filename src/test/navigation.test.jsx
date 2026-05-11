import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const useAuthMock = vi.fn();
const applyThemeMock = vi.fn();
const getInitialThemeMock = vi.fn();

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/lib/theme', () => ({
  applyTheme: (theme) => applyThemeMock(theme),
  getInitialTheme: () => getInitialThemeMock(),
}));

import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';

describe('Navigation and route protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInitialThemeMock.mockReturnValue('light');
  });

  it('mostra indicador de carregamento enquanto valida a sessao', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, loading: true });

    render(
      <MemoryRouter>
        <ProtectedRoute />
      </MemoryRouter>
    );

    expect(screen.getByText('Preparando sessao...')).toBeInTheDocument();
  });

  it('redireciona para /login quando o usuario nao esta autenticado', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, loading: false });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Area protegida</div>} />
          </Route>
          <Route path="/login" element={<div>Tela de Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Tela de Login')).toBeInTheDocument();
  });

  it('renderiza conteudo protegido quando autenticado', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, loading: false });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Area protegida</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Area protegida')).toBeInTheDocument();
  });

  it('renderiza links da sidebar e fecha o menu mobile ao navegar', async () => {
    const user = userEvent.setup();
    const setMobileOpen = vi.fn();

    useAuthMock.mockReturnValue({ logout: vi.fn(), user: { id: 'admin-1' } });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar
          collapsed={false}
          setCollapsed={vi.fn()}
          mobileOpen
          setMobileOpen={setMobileOpen}
          theme="light"
          toggleTheme={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Ativos')).toBeInTheDocument();
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
    expect(screen.getByText('Termos de Posse')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Ativos' }));

    expect(setMobileOpen).toHaveBeenCalledWith(false);
  });

  it('inicializa o layout com tema salvo e permite alternar o tema', async () => {
    const user = userEvent.setup();

    useAuthMock.mockReturnValue({ logout: vi.fn(), user: { id: 'admin-1' } });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div>Conteudo da pagina</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(applyThemeMock).toHaveBeenCalledWith('light');
    expect(screen.getByText('Conteudo da pagina')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Modo Escuro' }));

    expect(applyThemeMock).toHaveBeenLastCalledWith('dark');
  });
});
