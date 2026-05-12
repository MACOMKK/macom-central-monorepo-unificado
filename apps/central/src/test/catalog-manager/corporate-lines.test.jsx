import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';

import {
  catalogApi,
  readImportFileRows,
  renderCatalogManager,
  resetCatalogManagerMocks,
} from '@/test/catalog-manager/harness';

describe('CatalogManager corporate lines', () => {
  beforeEach(resetCatalogManagerMocks);

  it('bloqueia exclusao de linha corporativa vinculada', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.linhas_corporativas.list.mockResolvedValue([
      {
        id: 'line-1',
        numero: '85999999999',
        nome: 'Linha Comercial',
        operadora: 'Claro',
        colaborador_id: 'col-1',
      },
    ]);

    renderCatalogManager('linhas_corporativas');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Nao e permitido excluir uma linha corporativa com colaborador vinculado.');
    expect(catalogApi.linhas_corporativas.remove).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('bloqueia exclusao em lote de linhas corporativas vinculadas', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.linhas_corporativas.list.mockResolvedValue([
      {
        id: 'line-bulk-1',
        numero: '85911111111',
        nome: 'Linha Vinculada',
        operadora: 'Claro',
        colaborador_id: 'col-1',
      },
      {
        id: 'line-bulk-2',
        numero: '85922222222',
        nome: 'Linha Livre',
        operadora: 'Vivo',
      },
    ]);

    renderCatalogManager('linhas_corporativas');

    await user.click(await screen.findByRole('checkbox', { name: 'Selecionar linha corporativa Linha Vinculada' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar linha corporativa Linha Livre' }));
    await user.click(screen.getByRole('button', { name: /Excluir selecionados/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nao e permitido excluir linhas corporativas com colaborador vinculado.'
    );
    expect(catalogApi.linhas_corporativas.remove).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('nao exibe colaboradores inativos na lista de vinculacao de linhas corporativas', async () => {
    const user = userEvent.setup();
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-1', nome: 'Joao Ativo', email: 'joao@macom.com', status: 'ativo' },
      { id: 'col-2', nome: 'Maria Inativa', email: 'maria@macom.com', status: 'inativo' },
    ]);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.linhas_corporativas.list.mockResolvedValue([
      {
        id: 'line-2',
        numero: '85988887777',
        nome: 'Linha Diretoria',
        operadora: 'Claro',
      },
    ]);

    renderCatalogManager('linhas_corporativas');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Vincular colaborador' }));

    expect(await screen.findByText('Joao Ativo')).toBeInTheDocument();
    expect(screen.queryByText('Maria Inativa')).not.toBeInTheDocument();
  });

  it('valida campos obrigatorios ao criar uma nova linha corporativa', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('linhas_corporativas');

    await user.click(await screen.findByRole('button', { name: 'Novo Linha' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Preencha o campo obrigatorio: Numero.')).toBeInTheDocument();
    expect(catalogApi.linhas_corporativas.create).not.toHaveBeenCalled();
  });

  it('valida numero invalido ao criar uma nova linha corporativa', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('linhas_corporativas');

    await user.click(await screen.findByRole('button', { name: 'Novo Linha' }));
    await user.type(screen.getByLabelText('Numero'), '123');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Numero deve conter exatamente 11 digitos.')).toBeInTheDocument();
    expect(catalogApi.linhas_corporativas.create).not.toHaveBeenCalled();
  });

  it('envia o payload correto ao criar uma nova linha corporativa', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('linhas_corporativas');

    await user.click(await screen.findByRole('button', { name: 'Novo Linha' }));
    await user.clear(screen.getByLabelText('Tipo'));
    await user.type(screen.getByLabelText('Tipo'), 'linha_movel');
    await user.type(screen.getByLabelText('Nome / Identificacao'), 'Linha Comercial 01');
    await user.type(screen.getByLabelText('Numero'), '85999999999');
    await user.type(screen.getByLabelText('Operadora'), 'Vivo');
    await user.clear(screen.getByLabelText('Status'));
    await user.type(screen.getByLabelText('Status'), 'em_uso');
    await user.type(screen.getByLabelText('Colaborador Vinculado'), 'col-1');
    await user.type(screen.getByLabelText('Unidade / Filial'), 'unit-1');
    await user.type(screen.getByLabelText('Observacao'), 'Linha principal do comercial');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(catalogApi.linhas_corporativas.create).toHaveBeenCalledWith({
        tipo: 'linha_movel',
        nome: 'Linha Comercial 01',
        numero: '85999999999',
        operadora: 'Vivo',
        status: 'em_uso',
        colaborador_id: 'col-1',
        unidade_id: 'unit-1',
        observacao: 'Linha principal do comercial',
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Registro salvo com sucesso.');
  });

  it('importa linhas corporativas com sucesso a partir do preview carregado', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    readImportFileRows.mockResolvedValue([
      {
        tipo: 'linha_movel',
        nome: 'Linha Importada',
        numero: '85999999999',
        operadora: 'Vivo',
        status: 'em_uso',
        colaborador_email: 'joao@macom.com',
        unidade: 'Matriz',
        observacao: 'Linha principal',
      },
    ]);

    renderCatalogManager('linhas_corporativas');

    await user.click(await screen.findByRole('button', { name: 'Importar linhas corporativas' }));
    const fileInput = screen.getByLabelText('Arquivo de importacao de linhas corporativas');
    const file = new File(['fake'], 'linhas.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Confirmar importacao de linhas corporativas' }));

    await waitFor(() => {
      expect(catalogApi.linhas_corporativas.create).toHaveBeenCalledWith({
        tipo: 'linha_movel',
        nome: 'Linha Importada',
        numero: '85999999999',
        operadora: 'Vivo',
        status: 'em_uso',
        colaborador_id: 'col-1',
        unidade_id: 'unit-1',
        observacao: 'Linha principal',
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('1 linha(s) corporativa(s) importada(s) com sucesso.');
  });
});
