import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';

import {
  catalogApi,
  deleteMutateMock,
  renderCatalogManager,
  resetCatalogManagerMocks,
} from '@/test/catalog-manager/harness';

describe('CatalogManager departments and units', () => {
  beforeEach(resetCatalogManagerMocks);

  it('valida campos obrigatorios ao criar um novo departamento', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([]);

    renderCatalogManager('departamentos');

    await user.click(await screen.findByRole('button', { name: 'Novo Departamento' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Preencha o campo obrigatorio: Nome.')).toBeInTheDocument();
    expect(catalogApi.departamentos.create).not.toHaveBeenCalled();
  });

  it('envia o payload correto ao criar um novo departamento', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([]);
    catalogApi.departamentos.create.mockResolvedValue({ id: 'dep-created' });

    renderCatalogManager('departamentos');

    await user.click(await screen.findByRole('button', { name: 'Novo Departamento' }));
    await user.type(screen.getByLabelText('Nome'), 'Tecnologia');
    await user.type(screen.getByLabelText('Descricao'), 'Responsavel por sistemas internos');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(catalogApi.departamentos.create).toHaveBeenCalledWith({
        nome: 'Tecnologia',
        descricao: 'Responsavel por sistemas internos',
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Registro salvo com sucesso.');
  });

  it('remove departamento pelo card', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([]);
    catalogApi.departamentos.list.mockResolvedValue([
      { id: 'dep-1', nome: 'Tecnologia', descricao: 'TI' },
    ]);
    catalogApi.departamentos.remove.mockImplementation(deleteMutateMock);

    renderCatalogManager('departamentos');

    const cardTitle = await screen.findByText('Tecnologia');
    const card = cardTitle.closest('div[class]')?.parentElement?.parentElement;
    const buttons = within(card).getAllByRole('button');
    await user.click(buttons[1]);

    await waitFor(() => {
      expect(deleteMutateMock).toHaveBeenCalledWith('dep-1');
    });
    expect(window.confirm).toHaveBeenCalled();
  });

  it('nao remove departamento com colaborador vinculado', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-1', nome: 'Joao', departamento_id: 'dep-1' },
    ]);
    catalogApi.departamentos.list.mockResolvedValue([
      { id: 'dep-1', nome: 'Tecnologia', descricao: 'TI' },
    ]);

    renderCatalogManager('departamentos');

    const cardTitle = await screen.findByText('Tecnologia');
    const card = cardTitle.closest('div[class]')?.parentElement?.parentElement;
    const buttons = within(card).getAllByRole('button');
    await user.click(buttons[1]);

    expect(screen.getByRole('alert')).toHaveTextContent('Nao e permitido excluir um departamento com colaboradores vinculados.');
    expect(deleteMutateMock).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('nao remove departamento quando a exclusao e cancelada', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(false);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([]);
    catalogApi.departamentos.list.mockResolvedValue([
      { id: 'dep-1', nome: 'Tecnologia', descricao: 'TI' },
    ]);

    renderCatalogManager('departamentos');

    const cardTitle = await screen.findByText('Tecnologia');
    const card = cardTitle.closest('div[class]')?.parentElement?.parentElement;
    const buttons = within(card).getAllByRole('button');
    await user.click(buttons[1]);

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteMutateMock).not.toHaveBeenCalled();
  });

  it('ignora colaboradores inativos na contagem de departamentos', async () => {
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-1', nome: 'Joao', departamento_id: 'dep-1', status: 'ativo' },
      { id: 'col-2', nome: 'Maria', departamento_id: 'dep-1', status: 'inativo' },
    ]);
    catalogApi.departamentos.list.mockResolvedValue([
      { id: 'dep-1', nome: 'Tecnologia', descricao: 'TI' },
    ]);

    renderCatalogManager('departamentos');

    expect(await screen.findByText('Tecnologia')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('valida campos obrigatorios ao criar uma nova unidade', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([]);

    renderCatalogManager('unidades');

    await user.click(await screen.findByRole('button', { name: 'Novo Unidade' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Preencha o campo obrigatorio: Nome da Unidade.')).toBeInTheDocument();
    expect(catalogApi.unidades.create).not.toHaveBeenCalled();
  });

  it('envia o payload correto ao criar uma nova unidade', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([]);
    catalogApi.unidades.create.mockResolvedValue({ id: 'unit-created' });

    renderCatalogManager('unidades');

    await user.click(await screen.findByRole('button', { name: 'Novo Unidade' }));
    await user.type(screen.getByLabelText('Nome da Unidade'), 'Macom Belem');
    await user.type(screen.getByLabelText('CNPJ'), '12345678000190');
    await user.type(screen.getByLabelText('Cidade'), 'Belem');
    await user.type(screen.getByLabelText('Endereco'), 'Rua A, 123');
    await user.type(screen.getByLabelText('Telefone'), '9130000000');
    await user.clear(screen.getByLabelText('Status'));
    await user.type(screen.getByLabelText('Status'), 'true');
    await user.type(screen.getByLabelText('Responsavel pela Unidade'), 'Carlos Silva');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(catalogApi.unidades.create).toHaveBeenCalledWith({
        nome: 'Macom Belem',
        cnpj: '12345678000190',
        cidade: 'Belem',
        endereco: 'Rua A, 123',
        telefone: '9130000000',
        ativo: true,
        responsavel: 'Carlos Silva',
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Registro salvo com sucesso.');
  });

  it('valida CNPJ invalido ao criar uma nova unidade', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([]);

    renderCatalogManager('unidades');

    await user.click(await screen.findByRole('button', { name: 'Novo Unidade' }));
    await user.type(screen.getByLabelText('Nome da Unidade'), 'Macom Belem');
    await user.type(screen.getByLabelText('CNPJ'), '123');
    await user.type(screen.getByLabelText('Cidade'), 'Belem');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('CNPJ deve conter exatamente 14 digitos.')).toBeInTheDocument();
    expect(catalogApi.unidades.create).not.toHaveBeenCalled();
  });

  it('remove unidade pelo card', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([]);
    catalogApi.unidades.list.mockResolvedValue([
      { id: 'unit-1', nome: 'Matriz', cnpj: '12345678000190', cidade: 'Fortaleza', ativo: true },
    ]);
    catalogApi.unidades.remove.mockImplementation(deleteMutateMock);

    renderCatalogManager('unidades');

    const cardTitle = await screen.findByText('Matriz');
    expect(screen.getByText('12.345.678/0001-90')).toBeInTheDocument();
    const card = cardTitle.closest('div[class]')?.parentElement?.parentElement?.parentElement;
    const buttons = within(card).getAllByRole('button');
    await user.click(buttons[1]);

    await waitFor(() => {
      expect(deleteMutateMock).toHaveBeenCalledWith('unit-1');
    });
    expect(window.confirm).toHaveBeenCalled();
  });

  it('nao remove unidade com colaborador vinculado', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-1', nome: 'Joao', unidade_id: 'unit-1' },
    ]);
    catalogApi.unidades.list.mockResolvedValue([
      { id: 'unit-1', nome: 'Matriz', cidade: 'Fortaleza', ativo: true },
    ]);

    renderCatalogManager('unidades');

    const cardTitle = await screen.findByText('Matriz');
    const card = cardTitle.closest('div[class]')?.parentElement?.parentElement?.parentElement;
    const buttons = within(card).getAllByRole('button');
    await user.click(buttons[1]);

    expect(screen.getByRole('alert')).toHaveTextContent('Nao e permitido excluir uma unidade com colaboradores vinculados.');
    expect(deleteMutateMock).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('nao remove unidade quando a exclusao e cancelada', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(false);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([]);
    catalogApi.unidades.list.mockResolvedValue([
      { id: 'unit-1', nome: 'Matriz', cidade: 'Fortaleza', ativo: true },
    ]);

    renderCatalogManager('unidades');

    const cardTitle = await screen.findByText('Matriz');
    const card = cardTitle.closest('div[class]')?.parentElement?.parentElement?.parentElement;
    const buttons = within(card).getAllByRole('button');
    await user.click(buttons[1]);

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteMutateMock).not.toHaveBeenCalled();
  });

  it('ignora colaboradores inativos na contagem de unidades', async () => {
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-1', nome: 'Joao', unidade_id: 'unit-1', status: 'ativo' },
      { id: 'col-2', nome: 'Maria', unidade_id: 'unit-1', status: 'inativo' },
    ]);
    catalogApi.unidades.list.mockResolvedValue([
      { id: 'unit-1', nome: 'Matriz', cidade: 'Fortaleza', ativo: true },
    ]);

    renderCatalogManager('unidades');

    expect(await screen.findByText('Matriz')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
