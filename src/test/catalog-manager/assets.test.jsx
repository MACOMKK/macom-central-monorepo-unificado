import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';

import {
  catalogApi,
  deleteMutateMock,
  readImportFileRows,
  renderCatalogManager,
  resetCatalogManagerMocks,
} from '@/test/catalog-manager/harness';

describe('CatalogManager assets', () => {
  beforeEach(resetCatalogManagerMocks);

  it('abre e fecha o menu de acoes de ativos', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-1',
        nome: 'Notebook Dell',
        categoria: 'Notebook',
        numero_serie: 'SN-001',
        patrimonio: 'PAT-001',
        unidade_id: 'unit-1',
        status: 'disponivel',
      },
    ]);

    renderCatalogManager('ativos');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);

    expect(screen.getByRole('button', { name: 'Vincular colaborador' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('button', { name: 'Vincular colaborador' })).not.toBeInTheDocument();
  });

  it('bloqueia exclusao de ativo vinculado e exibe feedback', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-2',
        nome: 'MacBook Pro',
        categoria: 'Notebook',
        numero_serie: 'SN-002',
        patrimonio: 'PAT-002',
        unidade_id: 'unit-1',
        usuario_id: 'col-1',
        status: 'em_uso',
      },
    ]);

    renderCatalogManager('ativos');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Nao e permitido excluir um ativo com usuario vinculado.');
    expect(deleteMutateMock).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('nao exibe colaboradores inativos na lista de vinculacao de ativos', async () => {
    const user = userEvent.setup();
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-1', nome: 'Joao Ativo', email: 'joao@macom.com', status: 'ativo' },
      { id: 'col-2', nome: 'Maria Inativa', email: 'maria@macom.com', status: 'inativo' },
    ]);
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-3',
        nome: 'Notebook Dell',
        categoria: 'Notebook',
        numero_serie: 'SN-003',
        patrimonio: 'PAT-003',
        unidade_id: 'unit-1',
        status: 'disponivel',
      },
    ]);

    renderCatalogManager('ativos');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Vincular colaborador' }));

    expect(await screen.findByText('Joao Ativo')).toBeInTheDocument();
    expect(screen.queryByText('Maria Inativa')).not.toBeInTheDocument();
  });

  it('valida campos obrigatorios ao criar um novo ativo', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('ativos');

    await user.click(await screen.findByRole('button', { name: 'Novo Ativo' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Preencha o campo obrigatorio: Nome.')).toBeInTheDocument();
    expect(catalogApi.ativos.create).not.toHaveBeenCalled();
  });

  it('envia o payload correto ao criar um novo ativo', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('ativos');

    await user.click(await screen.findByRole('button', { name: 'Novo Ativo' }));
    await user.type(screen.getByLabelText('Nome'), 'Notebook Lenovo');
    await user.type(screen.getByLabelText('Categoria'), 'Notebook');
    await user.type(screen.getByLabelText('Numero de serie'), 'SN-900');
    await user.type(screen.getByLabelText('Patrimonio'), 'PAT-900');
    await user.type(screen.getByLabelText('Marca'), 'Lenovo');
    await user.type(screen.getByLabelText('Modelo'), 'ThinkPad');
    await user.type(screen.getByLabelText('Unidade'), 'unit-1');
    await user.type(screen.getByLabelText('Localizacao interna'), 'Sala TI');
    await user.type(screen.getByLabelText('Estado'), 'novo');
    await user.type(screen.getByLabelText('Observacao'), 'Equipamento novo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(catalogApi.ativos.create).toHaveBeenCalledWith({
        nome: 'Notebook Lenovo',
        categoria: 'Notebook',
        marca: 'Lenovo',
        modelo: 'ThinkPad',
        numero_serie: 'SN-900',
        patrimonio: 'PAT-900',
        unidade_id: 'unit-1',
        localizacao_interna: 'Sala TI',
        estado: 'novo',
        observacao: 'Equipamento novo',
        usuario_id: null,
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Registro salvo com sucesso.');
  });

  it('preenche os campos ao editar um ativo e envia o payload correto no update', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-10',
        nome: 'Notebook Dell',
        categoria: 'Notebook',
        marca: 'Dell',
        modelo: 'Latitude 5440',
        numero_serie: 'SN-010',
        patrimonio: 'PAT-010',
        unidade_id: 'unit-1',
        localizacao_interna: 'Mesa 10',
        observacao: 'Equipamento atual',
        estado: 'bom',
        usuario_id: 'col-1',
        status: 'em_uso',
      },
    ]);

    renderCatalogManager('ativos');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Editar' }));

    expect(await screen.findByRole('heading', { name: 'Editar Ativo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Notebook Dell');
    expect(screen.getByLabelText('Categoria')).toHaveValue('Notebook');
    expect(screen.getByLabelText('Numero de serie')).toHaveValue('SN-010');
    expect(screen.getByLabelText('Patrimonio')).toHaveValue('PAT-010');
    expect(screen.getByLabelText('Unidade')).toHaveValue('unit-1');

    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Notebook Dell Atualizado');
    await user.clear(screen.getByLabelText('Marca'));
    await user.type(screen.getByLabelText('Marca'), 'Lenovo');
    await user.clear(screen.getByLabelText('Modelo'));
    await user.type(screen.getByLabelText('Modelo'), 'ThinkPad T14');
    await user.clear(screen.getByLabelText('Localizacao interna'));
    await user.type(screen.getByLabelText('Localizacao interna'), 'Sala TI');
    await user.clear(screen.getByLabelText('Observacao'));
    await user.type(screen.getByLabelText('Observacao'), 'Equipamento remanejado');
    await user.clear(screen.getByLabelText('Estado'));
    await user.type(screen.getByLabelText('Estado'), 'novo');
    await user.clear(screen.getByLabelText('Usuario vinculado'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(catalogApi.ativos.update).toHaveBeenCalledWith('asset-10', {
        nome: 'Notebook Dell Atualizado',
        categoria: 'Notebook',
        marca: 'Lenovo',
        modelo: 'ThinkPad T14',
        numero_serie: 'SN-010',
        patrimonio: 'PAT-010',
        unidade_id: 'unit-1',
        localizacao_interna: 'Sala TI',
        observacao: 'Equipamento remanejado',
        estado: 'novo',
        usuario_id: null,
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Registro salvo com sucesso.');
  });

  it('exibe feedback de erro quando a edicao de ativo falha', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.update.mockRejectedValueOnce(new Error('Falha ao atualizar ativo.'));
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-11',
        nome: 'Notebook HP',
        categoria: 'Notebook',
        numero_serie: 'SN-011',
        patrimonio: 'PAT-011',
        unidade_id: 'unit-1',
        status: 'disponivel',
      },
    ]);

    renderCatalogManager('ativos');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Notebook HP Atualizado');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Falha ao atualizar ativo.');
    });
  });

  it('importa ativos com sucesso a partir do preview carregado', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    readImportFileRows.mockResolvedValue([
      {
        nome: 'Notebook Importado',
        categoria: 'notebook',
        marca: 'Dell',
        modelo: 'Latitude',
        numero_serie: 'SN-IMPORT-1',
        patrimonio: 'PAT-IMPORT-1',
        unidade: 'Matriz',
        localizacao_interna: 'Sala 1',
        observacao: 'Importado',
        estado: 'bom',
        responsavel_email: 'joao@macom.com',
      },
    ]);

    renderCatalogManager('ativos');

    await user.click(await screen.findByRole('button', { name: 'Importar ativos' }));
    const fileInput = screen.getByLabelText('Arquivo de importacao de ativos');
    const file = new File(['fake'], 'ativos.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Confirmar importacao' }));

    await waitFor(() => {
      expect(catalogApi.ativos.create).toHaveBeenCalledWith({
        nome: 'Notebook Importado',
        categoria: 'notebook',
        marca: 'Dell',
        modelo: 'Latitude',
        numero_serie: 'SN-IMPORT-1',
        patrimonio: 'PAT-IMPORT-1',
        unidade_id: 'unit-1',
        localizacao_interna: 'Sala 1',
        observacao: 'Importado',
        estado: 'bom',
        usuario_id: 'col-1',
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('1 ativo(s) importado(s) com sucesso.');
  });

  it('exibe erro quando a importacao de ativos nao encontra a unidade', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    readImportFileRows.mockResolvedValue([
      {
        nome: 'Notebook Sem Unidade',
        categoria: 'notebook',
        numero_serie: 'SN-ERR-1',
        unidade: 'Unidade Inexistente',
      },
    ]);

    renderCatalogManager('ativos');

    await user.click(await screen.findByRole('button', { name: 'Importar ativos' }));
    const fileInput = screen.getByLabelText('Arquivo de importacao de ativos');
    const file = new File(['fake'], 'ativos.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Confirmar importacao' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Linha 2: Unidade nao encontrada: Unidade Inexistente');
    });

    expect(catalogApi.ativos.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Notebook Sem Unidade' })
    );
  });
});
