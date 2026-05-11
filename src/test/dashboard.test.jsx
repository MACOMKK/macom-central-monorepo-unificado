import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { ativosListMock, colaboradoresListMock } = vi.hoisted(() => ({
  ativosListMock: vi.fn(),
  colaboradoresListMock: vi.fn(),
}));

vi.mock('@/lib/catalogApi', () => ({
  catalogApi: {
    ativos: { list: ativosListMock },
    colaboradores: { list: colaboradoresListMock },
  },
}));

import Dashboard from '@/pages/Dashboard';

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

describe('Dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza estatisticas e ultimos ativos com dados carregados', async () => {
    colaboradoresListMock.mockResolvedValue([
      { id: 'col-1', nome: 'Joao Silva' },
      { id: 'col-2', nome: 'Maria Souza' },
    ]);
    ativosListMock.mockResolvedValue([
      { id: 'asset-1', nome: 'Notebook Dell', status: 'disponivel', categoria: 'Notebook', patrimonio: 'PAT-001' },
      { id: 'asset-2', nome: 'Monitor LG', status: 'em_uso', categoria: 'Monitor', patrimonio: 'PAT-002', usuario_id: 'col-1' },
      { id: 'asset-3', nome: 'Impressora HP', status: 'manutencao', categoria: 'Periferico', patrimonio: 'PAT-003', usuario_id: 'col-2' },
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Total de Ativos')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    expect(screen.getByText('Notebook Dell')).toBeInTheDocument();
    expect(screen.getByText('Monitor LG')).toBeInTheDocument();
    expect(screen.getByText('Impressora HP')).toBeInTheDocument();
    expect(screen.getByText('Joao Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.getByText('Notebook')).toBeInTheDocument();
    expect(screen.getByText('Monitor')).toBeInTheDocument();
    expect(screen.getByText('Periferico')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao existem ativos', async () => {
    colaboradoresListMock.mockResolvedValue([]);
    ativosListMock.mockResolvedValue([]);

    renderDashboard();

    expect(await screen.findAllByText(/Nenhum dado para exibir|Nenhum ativo cadastrado ainda/i)).toHaveLength(3);
  });
});
