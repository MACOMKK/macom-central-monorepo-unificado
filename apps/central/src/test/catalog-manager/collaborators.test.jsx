import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';

import {
  catalogApi,
  readImportFileRows,
  renderCatalogManager,
  resetCatalogManagerMocks,
  systemAccessApi,
} from '@/test/catalog-manager/harness';

describe('CatalogManager collaborators', () => {
  beforeEach(resetCatalogManagerMocks);

  it('bloqueia exclusao de colaborador com itens vinculados', async () => {
    const user = userEvent.setup();
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-1', nome: 'Joao', email: 'joao@macom.com', status: 'ativo' },
    ]);
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-1',
        nome: 'Notebook Dell',
        categoria: 'Notebook',
        numero_serie: 'SN-001',
        patrimonio: 'PAT-001',
        unidade_id: 'unit-1',
        usuario_id: 'col-1',
        status: 'em_uso',
      },
    ]);

    renderCatalogManager('colaboradores');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Nao e permitido excluir um colaborador com itens vinculados.');
    expect(catalogApi.colaboradores.remove).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('remove varios colaboradores selecionados de uma vez', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true);
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-bulk-1', nome: 'Ana Silva', email: 'ana@macom.com', status: 'ativo' },
      { id: 'col-bulk-2', nome: 'Bruno Lima', email: 'bruno@macom.com', status: 'ativo' },
    ]);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.linhas_corporativas.list.mockResolvedValue([]);

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('checkbox', { name: 'Selecionar colaborador Ana Silva' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar colaborador Bruno Lima' }));
    await user.click(screen.getByRole('button', { name: /Excluir selecionados/i }));

    await waitFor(() => {
      expect(catalogApi.colaboradores.remove).toHaveBeenCalledWith('col-bulk-1');
      expect(catalogApi.colaboradores.remove).toHaveBeenCalledWith('col-bulk-2');
    });

    expect(window.confirm).toHaveBeenCalledWith(
      'Deseja realmente excluir 2 colaborador(es) selecionado(s)?'
    );
    expect(screen.getByRole('alert')).toHaveTextContent('2 registro(s) removido(s) com sucesso.');
  });

  it('bloqueia exclusao em lote de colaboradores quando houver itens vinculados', async () => {
    const user = userEvent.setup();
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-bulk-linked-1', nome: 'Carlos Vinculado', email: 'carlos@macom.com', status: 'ativo' },
      { id: 'col-bulk-free-1', nome: 'Debora Livre', email: 'debora@macom.com', status: 'ativo' },
    ]);
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-col-linked-1',
        nome: 'Notebook Vinculado',
        categoria: 'Notebook',
        numero_serie: 'SN-COL-LINKED',
        patrimonio: 'PAT-COL-LINKED',
        unidade_id: 'unit-1',
        usuario_id: 'col-bulk-linked-1',
        status: 'em_uso',
      },
    ]);
    catalogApi.linhas_corporativas.list.mockResolvedValue([]);

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('checkbox', { name: 'Selecionar colaborador Carlos Vinculado' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar colaborador Debora Livre' }));
    await user.click(screen.getByRole('button', { name: /Excluir selecionados/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nao e permitido excluir colaboradores com itens vinculados.'
    );
    expect(catalogApi.colaboradores.remove).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('exibe a acao de desvincular tudo para colaborador inativo com itens vinculados', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true);
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-1', nome: 'Joao', email: 'joao@macom.com', status: 'inativo' },
    ]);
    catalogApi.ativos.list.mockResolvedValue([
      {
        id: 'asset-1',
        nome: 'Notebook Dell',
        categoria: 'Notebook',
        numero_serie: 'SN-001',
        patrimonio: 'PAT-001',
        unidade_id: 'unit-1',
        usuario_id: 'col-1',
        status: 'em_uso',
      },
    ]);
    catalogApi.linhas_corporativas.list.mockResolvedValue([
      { id: 'line-1', numero: '85999999999', colaborador_id: 'col-1' },
    ]);

    renderCatalogManager('colaboradores');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    const unlinkButton = screen.getByRole('button', { name: 'Desvincular tudo' });
    expect(unlinkButton).toBeInTheDocument();

    await user.click(unlinkButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(catalogApi.colaboradores.unlinkAssignments).toHaveBeenCalledWith('col-1');
  });

  it('considera sistemas vinculados ao exibir a acao de desvincular tudo', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true);
    catalogApi.colaboradores.list.mockResolvedValue([
      { id: 'col-system-1', nome: 'Joao Sistema', email: 'joao.sistema@macom.com', status: 'inativo' },
    ]);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.linhas_corporativas.list.mockResolvedValue([]);
    systemAccessApi.accesses.list.mockResolvedValue([
      {
        id: 'access-1',
        colaborador_id: 'col-system-1',
        sistema_id: 'system-reports',
        nivel_acesso: 'usuario',
        ativo: true,
      },
    ]);

    renderCatalogManager('colaboradores');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Desvincular tudo' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Deseja realmente desvincular todos os ativos, linhas corporativas e sistemas de Joao Sistema?'
    );
    expect(catalogApi.colaboradores.unlinkAssignments).toHaveBeenCalledWith('col-system-1');
  });

  it('valida campos obrigatorios ao criar um novo colaborador', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('button', { name: 'Novo Colaborador' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Preencha o campo obrigatorio: Nome.')).toBeInTheDocument();
    expect(catalogApi.colaboradores.create).not.toHaveBeenCalled();
  });

  it('valida telefone invalido ao criar um novo colaborador', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('button', { name: 'Novo Colaborador' }));
    await user.type(screen.getByLabelText('Nome'), 'Maria Souza');
    await user.type(screen.getByLabelText('Email'), 'maria@macom.com');
    await user.type(screen.getByLabelText('Telefone'), '123');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Telefone deve conter exatamente 11 digitos.')).toBeInTheDocument();
    expect(catalogApi.colaboradores.create).not.toHaveBeenCalled();
  });

  it('envia o payload correto ao criar um novo colaborador', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('button', { name: 'Novo Colaborador' }));
    await user.type(screen.getByLabelText('Nome'), 'Maria Souza');
    await user.type(screen.getByLabelText('Email'), 'maria@macom.com');
    await user.type(screen.getByLabelText('CPF'), '12345678901');
    await user.type(screen.getByLabelText('Telefone'), '85999999999');
    await user.type(screen.getByLabelText('Cargo'), 'Analista de TI');
    await user.type(screen.getByLabelText('Data de nascimento'), '1994-08-10');
    await user.type(screen.getByLabelText('Data de admissao'), '2026-05-11');
    await user.clear(screen.getByLabelText('Funcao'));
    await user.type(screen.getByLabelText('Funcao'), 'admin');
    await user.type(screen.getByLabelText('Departamento'), 'dep-1');
    await user.clear(screen.getByLabelText('Status'));
    await user.type(screen.getByLabelText('Status'), 'inativo');
    await user.type(screen.getByLabelText('Unidade'), 'unit-1');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(catalogApi.colaboradores.create).toHaveBeenCalledWith({
        nome: 'Maria Souza',
        email: 'maria@macom.com',
        password: 'Kmacom.123',
        funcao: 'admin',
        cpf: '12345678901',
        telefone: '85999999999',
        departamento_id: 'dep-1',
        cargo_id: 'Analista de TI',
        data_nascimento: '1994-08-10',
        data_admissao: '2026-05-11',
        status: 'inativo',
        unidade_id: 'unit-1',
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Registro salvo com sucesso.');
  });

  it('preenche os campos ao editar um colaborador e envia o payload correto no update', async () => {
    const user = userEvent.setup();
    catalogApi.colaboradores.list.mockResolvedValue([
      {
        id: 'col-10',
        nome: 'Maria Souza',
        email: 'maria@macom.com',
        funcao: 'admin',
        cpf: '12345678901',
        telefone: '85999999999',
        departamento_id: 'dep-1',
        cargo: 'Analista de TI',
        data_nascimento: '1994-08-10',
        data_admissao: '2026-05-11',
        status: 'ativo',
        unidade_id: 'unit-1',
      },
    ]);
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('colaboradores');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Editar' }));

    expect(await screen.findByRole('heading', { name: 'Editar Colaborador' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Maria Souza');
    expect(screen.getByLabelText('Email')).toHaveValue('maria@macom.com');
    expect(screen.queryByLabelText('Senha de acesso')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Funcao')).toHaveValue('admin');
    expect(screen.getByLabelText('Funcao')).toBeDisabled();
    expect(screen.getByLabelText('Telefone')).toHaveValue('85999999999');
    expect(screen.getByLabelText('Departamento')).toHaveValue('dep-1');
    expect(screen.getByLabelText('Data de nascimento')).toHaveValue('1994-08-10');
    expect(screen.getByLabelText('Status')).toBeDisabled();

    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Maria Souza Atualizada');
    await user.clear(screen.getByLabelText('Telefone'));
    await user.type(screen.getByLabelText('Telefone'), '85988887777');
    await user.clear(screen.getByLabelText('Cargo'));
    await user.type(screen.getByLabelText('Cargo'), 'Coordenadora de TI');
    await user.clear(screen.getByLabelText('Data de nascimento'));
    await user.type(screen.getByLabelText('Data de nascimento'), '1995-09-11');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(catalogApi.colaboradores.update).toHaveBeenCalledWith('col-10', {
        nome: 'Maria Souza Atualizada',
        email: 'maria@macom.com',
        funcao: 'admin',
        cpf: '12345678901',
        telefone: '85988887777',
        departamento_id: 'dep-1',
        cargo_id: 'Coordenadora de TI',
        data_nascimento: '1995-09-11',
        data_admissao: '2026-05-11',
        status: 'ativo',
        unidade_id: 'unit-1',
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Registro salvo com sucesso.');
  });

  it('exibe feedback de erro quando a edicao de colaborador falha', async () => {
    const user = userEvent.setup();
    catalogApi.colaboradores.update.mockRejectedValueOnce(new Error('Falha ao atualizar colaborador.'));
    catalogApi.colaboradores.list.mockResolvedValue([
      {
        id: 'col-11',
        nome: 'Joana Lima',
        email: 'joana@macom.com',
        funcao: 'usuario',
        status: 'ativo',
      },
    ]);
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('colaboradores');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Joana Lima Atualizada');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Falha ao atualizar colaborador.');
    });
  });

  it('importa colaboradores com sucesso a partir do preview carregado', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    readImportFileRows.mockResolvedValue([
      {
        nome: 'Maria Souza',
        email: 'maria@macom.com',
        password: 'Temp123',
        funcao: 'admin',
        cpf: '12345678901',
        telefone: '85999999999',
        departamento: 'Tecnologia',
        cargo: 'Analista de TI',
        data_nascimento: '1994-08-10',
        data_admissao: '2026-05-11',
        status: 'ativo',
        unidade: 'Matriz',
      },
    ]);

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('button', { name: 'Importar colaboradores' }));
    const fileInput = screen.getByLabelText('Arquivo de importacao de colaboradores');
    const file = new File(['fake'], 'colaboradores.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Confirmar importacao de colaboradores' }));

    await waitFor(() => {
      expect(catalogApi.colaboradores.create).toHaveBeenCalledWith({
        nome: 'Maria Souza',
        email: 'maria@macom.com',
        password: 'Temp123',
        funcao: 'usuario',
        cpf: '12345678901',
        telefone: '85999999999',
        departamento_id: 'dep-1',
        cargo: 'Analista de TI',
        data_nascimento: '1994-08-10',
        data_admissao: '2026-05-11',
        status: 'ativo',
        unidade_id: 'unit-1',
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('1 colaborador(es) importado(s) com sucesso.');
  });

  it('exibe relatorio do import com sucessos e erros de colaboradores', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    readImportFileRows.mockResolvedValue([
      {
        nome: 'Maria Importada',
        email: 'maria.importada@macom.com',
        password: '',
        cpf: '12345678901',
      },
      {
        nome: 'Email Existente',
        email: 'existente@macom.com',
        password: '',
        cpf: '12345678902',
      },
    ]);
    catalogApi.colaboradores.create
      .mockResolvedValueOnce({
        id: 'col-imported-1',
        nome: 'Maria Importada',
        email: 'maria.importada@macom.com',
      })
      .mockRejectedValueOnce(new Error('Ja existe um colaborador com este email.'));

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('button', { name: 'Importar colaboradores' }));
    const fileInput = screen.getByLabelText('Arquivo de importacao de colaboradores');
    const file = new File(['fake'], 'colaboradores.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Confirmar importacao de colaboradores' }));

    expect(await screen.findByText('Relatorio do import de colaboradores')).toBeInTheDocument();
    expect(screen.getByText('1 importado(s) com sucesso · 1 erro(s)')).toBeInTheDocument();
    expect(screen.getAllByText('Maria Importada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('maria.importada@macom.com').length).toBeGreaterThan(0);
    expect(screen.getByText('Linha 3: Ja existe um colaborador com este email.')).toBeInTheDocument();
  });

  it('usa senha padrao e funcao usuario quando importacao de colaboradores nao informa senha ou tenta funcao elevada', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    readImportFileRows.mockResolvedValue([
      {
        nome: 'Joao Importado',
        email: 'joao.importado@macom.com',
        password: '',
        funcao: 'gestor',
        departamento: 'Tecnologia',
        unidade: 'Matriz',
      },
    ]);

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('button', { name: 'Importar colaboradores' }));
    const fileInput = screen.getByLabelText('Arquivo de importacao de colaboradores');
    const file = new File(['fake'], 'colaboradores.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Confirmar importacao de colaboradores' }));

    await waitFor(() => {
      expect(catalogApi.colaboradores.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Joao Importado',
          email: 'joao.importado@macom.com',
          password: 'Kmacom.123',
          funcao: 'usuario',
          departamento_id: 'dep-1',
          unidade_id: 'unit-1',
        })
      );
    });
  });

  it('gera email provisorio pelo CPF quando importacao de colaboradores nao informa email', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    readImportFileRows.mockResolvedValue([
      {
        nome: 'Sem Email Importado',
        email: '',
        password: '',
        funcao: 'gestor',
        cpf: '123.456.789-01',
        cargo: 'Consultor',
        data_admissao: '2026-05-11',
      },
    ]);

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('button', { name: 'Importar colaboradores' }));
    const fileInput = screen.getByLabelText('Arquivo de importacao de colaboradores');
    const file = new File(['fake'], 'colaboradores.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Confirmar importacao de colaboradores' }));

    await waitFor(() => {
      expect(catalogApi.colaboradores.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Sem Email Importado',
          email: '12345678901@cadastro.macom.com.br',
          password: 'Kmacom.123',
          funcao: 'usuario',
          cpf: '12345678901',
          cargo: 'Consultor',
          data_admissao: '2026-05-11',
        })
      );
    });
  });

  it('normaliza datas brasileiras na importacao de colaboradores', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    readImportFileRows.mockResolvedValue([
      {
        nome: 'Data Brasileira',
        email: '',
        cpf: '12345678902',
        data_nascimento: '10/08/1994',
        data_admissao: '11/05/2026',
      },
    ]);

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('button', { name: 'Importar colaboradores' }));
    const fileInput = screen.getByLabelText('Arquivo de importacao de colaboradores');
    const file = new File(['fake'], 'colaboradores.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Confirmar importacao de colaboradores' }));

    await waitFor(() => {
      expect(catalogApi.colaboradores.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: '12345678902@cadastro.macom.com.br',
          data_nascimento: '1994-08-10',
          data_admissao: '2026-05-11',
        })
      );
    });
  });

  it('exibe erro claro quando data de colaborador importado e invalida', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    readImportFileRows.mockResolvedValue([
      {
        nome: 'Data Invalida',
        email: '',
        cpf: '12345678903',
        data_nascimento: '31/02/1994',
      },
    ]);

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('button', { name: 'Importar colaboradores' }));
    const fileInput = screen.getByLabelText('Arquivo de importacao de colaboradores');
    const file = new File(['fake'], 'colaboradores.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Confirmar importacao de colaboradores' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Linha 2: Data de nascimento invalida.');
    });

    expect(catalogApi.colaboradores.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Data Invalida' })
    );
  });

  it('exibe erro quando importacao de colaboradores nao informa email nem CPF', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    readImportFileRows.mockResolvedValue([
      {
        nome: 'Sem Email e Sem CPF',
        email: '',
        cpf: '',
      },
    ]);

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('button', { name: 'Importar colaboradores' }));
    const fileInput = screen.getByLabelText('Arquivo de importacao de colaboradores');
    const file = new File(['fake'], 'colaboradores.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Confirmar importacao de colaboradores' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Linha 2: Email obrigatorio ou CPF obrigatorio para gerar email provisório.');
    });

    expect(catalogApi.colaboradores.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Sem Email e Sem CPF' })
    );
  });

  it('exibe erro quando a importacao de colaboradores nao encontra o departamento', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);
    readImportFileRows.mockResolvedValue([
      {
        nome: 'Colaborador Sem Departamento',
        email: 'semdep@macom.com',
        password: 'Temp123',
        departamento: 'Departamento Inexistente',
        unidade: 'Matriz',
      },
    ]);

    renderCatalogManager('colaboradores');

    await user.click(await screen.findByRole('button', { name: 'Importar colaboradores' }));
    const fileInput = screen.getByLabelText('Arquivo de importacao de colaboradores');
    const file = new File(['fake'], 'colaboradores.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Confirmar importacao de colaboradores' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Linha 2: Departamento nao encontrado: Departamento Inexistente');
    });

    expect(catalogApi.colaboradores.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Colaborador Sem Departamento' })
    );
  });
});
