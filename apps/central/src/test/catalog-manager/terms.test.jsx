import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';

import {
  catalogApi,
  renderCatalogManager,
  resetCatalogManagerMocks,
} from '@/test/catalog-manager/harness';

describe('CatalogManager terms', () => {
  beforeEach(resetCatalogManagerMocks);

  it('valida campos obrigatorios ao gerar um novo termo', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-1',
        nome: 'Notebook Dell',
        patrimonio: 'PAT-001',
        numero_serie: 'SN-001',
      },
    ]);
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-1', nome: 'Joao', email: 'joao@macom.com' },
    ]);

    renderCatalogManager('termos_posse');

    await user.click(await screen.findByRole('button', { name: 'Novo Termo' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Preencha o campo obrigatorio: Ativo.')).toBeInTheDocument();
    expect(catalogApi.termos_posse.create).not.toHaveBeenCalled();
  });

  it('envia o payload correto ao gerar um novo termo', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-1',
        nome: 'Notebook Dell',
        patrimonio: 'PAT-001',
        numero_serie: 'SN-001',
      },
    ]);
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-1', nome: 'Joao', email: 'joao@macom.com' },
    ]);
    catalogApi.termos_posse.create.mockResolvedValue({ id: 'term-created' });

    renderCatalogManager('termos_posse');

    await user.click(await screen.findByRole('button', { name: 'Novo Termo' }));
    await user.type(screen.getByLabelText('Ativo'), 'asset-1');
    await user.type(screen.getByLabelText('Colaborador'), 'col-1');
    await user.clear(screen.getByLabelText('Status'));
    await user.type(screen.getByLabelText('Status'), 'assinado');
    await user.type(screen.getByLabelText('Observacoes'), 'Assinado digitalmente');
    await user.type(screen.getByLabelText('Conteudo do termo'), 'Conteudo customizado do termo');
    await user.type(screen.getByLabelText('Data de assinatura'), '2026-05-11');
    await user.type(screen.getByLabelText('Data de devolucao'), '2026-05-20');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(catalogApi.termos_posse.create).toHaveBeenCalledWith({
        ativo_id: 'asset-1',
        colaborador_id: 'col-1',
        status: 'assinado',
        observacoes: 'Assinado digitalmente',
        conteudo: 'Conteudo customizado do termo',
        assinado_em: '2026-05-11',
        devolvido_em: '2026-05-20',
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Registro salvo com sucesso.');
  });

  it('remove termo quando a exclusao e confirmada', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([]);
    catalogApi.termos_posse.list.mockResolvedValue([
      {
        id: 'term-1',
        codigo: 'TP-001',
        ativo_nome: 'Notebook Dell',
        ativo_patrimonio: 'PAT-001',
        colaborador_nome: 'Joao',
        colaborador_email: 'joao@macom.com',
        status: 'gerado',
      },
    ]);
    catalogApi.termos_posse.remove.mockResolvedValue(true);

    renderCatalogManager('termos_posse');

    const rowCode = await screen.findByText('TP-001');
    const row = rowCode.closest('tr');
    const buttons = within(row).getAllByRole('button');
    const deleteButton = buttons[1];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(catalogApi.termos_posse.remove).toHaveBeenCalledWith('term-1');
    });
  });
});
