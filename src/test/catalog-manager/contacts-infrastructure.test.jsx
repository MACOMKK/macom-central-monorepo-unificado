import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';

import {
  catalogApi,
  renderCatalogManager,
  resetCatalogManagerMocks,
} from '@/test/catalog-manager/harness';

describe('CatalogManager contacts and infrastructure', () => {
  beforeEach(resetCatalogManagerMocks);

  it('valida campos obrigatorios ao criar um novo contato', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('contatos');

    await user.click(await screen.findByRole('button', { name: 'Novo Contato' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Preencha o campo obrigatorio: Nome do Fornecedor.')).toBeInTheDocument();
    expect(catalogApi.contatos.create).not.toHaveBeenCalled();
  });

  it('valida telefone invalido ao criar um novo contato', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('contatos');

    await user.click(await screen.findByRole('button', { name: 'Novo Contato' }));
    await user.clear(screen.getByLabelText('Tipo'));
    await user.type(screen.getByLabelText('Tipo'), 'fornecedor');
    await user.type(screen.getByLabelText('Nome do Fornecedor'), 'Fornecedor XPTO');
    await user.type(screen.getByLabelText('Telefone'), '123');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Telefone do contato deve conter 10 ou 11 digitos.')).toBeInTheDocument();
    expect(catalogApi.contatos.create).not.toHaveBeenCalled();
  });

  it('envia o payload correto ao criar um novo contato', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('contatos');

    await user.click(await screen.findByRole('button', { name: 'Novo Contato' }));
    await user.clear(screen.getByLabelText('Tipo'));
    await user.type(screen.getByLabelText('Tipo'), 'fornecedor');
    await user.type(screen.getByLabelText('Nome do Fornecedor'), 'Fornecedor XPTO');
    await user.type(screen.getByLabelText('CNPJ / Identificador'), '12345678000190');
    await user.type(screen.getByLabelText('Descricao / Servico prestado'), 'Suporte de impressoras');
    await user.type(screen.getByLabelText('Nome do Contato'), 'Carlos Silva');
    await user.type(screen.getByLabelText('Telefone'), '85999999999');
    await user.type(screen.getByLabelText('E-mail'), 'contato@fornecedor.com');
    await user.type(screen.getByLabelText('Unidade / Filial'), 'unit-1');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(catalogApi.contatos.create).toHaveBeenCalledWith({
        tipo: 'fornecedor',
        nome: 'Fornecedor XPTO',
        identificador: '12345678000190',
        descricao: 'Suporte de impressoras',
        nome_contato: 'Carlos Silva',
        telefone: '85999999999',
        email: 'contato@fornecedor.com',
        unidade_id: 'unit-1',
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Registro salvo com sucesso.');
  });

  it('remove contato quando a exclusao e confirmada', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.contatos.list.mockResolvedValue([
      {
        id: 'contact-1',
        tipo: 'fornecedor',
        nome: 'Fornecedor XPTO',
        telefone: '85999999999',
        email: 'contato@fornecedor.com',
      },
    ]);

    renderCatalogManager('contatos');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(catalogApi.contatos.remove).toHaveBeenCalledWith('contact-1');
    });
    expect(window.confirm).toHaveBeenCalled();
  });

  it('nao remove contato quando a exclusao e cancelada', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(false);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.contatos.list.mockResolvedValue([
      {
        id: 'contact-2',
        tipo: 'fornecedor',
        nome: 'Fornecedor Cancelado',
        telefone: '85999999999',
        email: 'cancelado@fornecedor.com',
      },
    ]);

    renderCatalogManager('contatos');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(catalogApi.contatos.remove).not.toHaveBeenCalled();
  });

  it('valida campos obrigatorios ao criar um novo registro de infraestrutura', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('infra_estrutura');

    await user.click(await screen.findByRole('button', { name: 'Novo Registro de Infra' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Preencha o campo obrigatorio: Titulo / Nome.')).toBeInTheDocument();
    expect(catalogApi.infra_estrutura.create).not.toHaveBeenCalled();
  });

  it('valida endereco IP invalido ao criar um novo registro de infraestrutura', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('infra_estrutura');

    await user.click(await screen.findByRole('button', { name: 'Novo Registro de Infra' }));
    await user.type(screen.getByLabelText('Titulo / Nome'), 'Servidor Principal');
    await user.type(screen.getByLabelText('Endereco IP'), '999.1.1');
    await user.type(screen.getByLabelText('Unidade / Filial'), 'unit-1');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Informe um endereco IP valido.')).toBeInTheDocument();
    expect(catalogApi.infra_estrutura.create).not.toHaveBeenCalled();
  });

  it('envia o payload correto ao criar um novo registro de infraestrutura', async () => {
    const user = userEvent.setup();
    catalogApi.ativos.list.mockResolvedValue([]);

    renderCatalogManager('infra_estrutura');

    await user.click(await screen.findByRole('button', { name: 'Novo Registro de Infra' }));
    await user.clear(screen.getByLabelText('Tipo'));
    await user.type(screen.getByLabelText('Tipo'), 'link');
    await user.type(screen.getByLabelText('Titulo / Nome'), 'ERP Corporativo');
    await user.type(screen.getByLabelText('URL do Sistema'), 'https://erp.macom.com');
    await user.type(screen.getByLabelText('Descricao / Observacao'), 'Sistema principal');
    await user.type(screen.getByLabelText('Unidade / Filial'), 'unit-1');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(catalogApi.infra_estrutura.create).toHaveBeenCalledWith({
        tipo: 'link',
        nome: 'ERP Corporativo',
        valor_identificador: 'https://erp.macom.com',
        descricao: 'Sistema principal',
        unidade_id: 'unit-1',
      });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Registro salvo com sucesso.');
  });

  it('remove registro de infraestrutura quando a exclusao e confirmada', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.infra_estrutura.list.mockResolvedValue([
      {
        id: 'infra-1',
        tipo: 'ip',
        nome: 'Servidor Principal',
        valor_identificador: '10.0.0.1',
        unidade_id: 'unit-1',
      },
    ]);

    renderCatalogManager('infra_estrutura');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(catalogApi.infra_estrutura.remove).toHaveBeenCalledWith('infra-1');
    });
    expect(window.confirm).toHaveBeenCalled();
  });

  it('exibe feedback de erro quando a remocao de infraestrutura falha', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.infra_estrutura.remove.mockRejectedValueOnce(new Error('Falha ao remover infraestrutura.'));
    catalogApi.infra_estrutura.list.mockResolvedValue([
      {
        id: 'infra-2',
        tipo: 'ip',
        nome: 'Servidor Secundario',
        valor_identificador: '10.0.0.2',
        unidade_id: 'unit-1',
      },
    ]);

    renderCatalogManager('infra_estrutura');

    const trigger = await screen.findByRole('button', { name: 'Abrir menu de acoes' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Falha ao remover infraestrutura.');
    });
  });

  it('remove varios registros de infraestrutura selecionados de uma vez', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.infra_estrutura.list.mockResolvedValue([
      {
        id: 'infra-bulk-1',
        tipo: 'ip',
        nome: 'Servidor A',
        valor_identificador: '10.0.0.10',
        unidade_id: 'unit-1',
      },
      {
        id: 'infra-bulk-2',
        tipo: 'link',
        nome: 'Sistema B',
        valor_identificador: 'https://sistema-b.macom.com',
        unidade_id: 'unit-1',
      },
    ]);

    renderCatalogManager('infra_estrutura');

    await user.click(await screen.findByRole('checkbox', { name: 'Selecionar infraestrutura Servidor A' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar infraestrutura Sistema B' }));
    await user.click(screen.getByRole('button', { name: /Excluir selecionados/i }));

    await waitFor(() => {
      expect(catalogApi.infra_estrutura.remove).toHaveBeenCalledWith('infra-bulk-1');
      expect(catalogApi.infra_estrutura.remove).toHaveBeenCalledWith('infra-bulk-2');
    });

    expect(window.confirm).toHaveBeenCalledWith(
      'Deseja realmente excluir 2 registro(s) de infraestrutura selecionado(s)?'
    );
    expect(screen.getByRole('alert')).toHaveTextContent('2 registro(s) removido(s) com sucesso.');
  });

  it('nao remove registros de infraestrutura selecionados quando a exclusao em lote e cancelada', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(false);
    catalogApi.ativos.list.mockResolvedValue([]);
    catalogApi.infra_estrutura.list.mockResolvedValue([
      {
        id: 'infra-bulk-cancel-1',
        tipo: 'ip',
        nome: 'Servidor Cancelado 1',
        valor_identificador: '10.0.0.21',
        unidade_id: 'unit-1',
      },
      {
        id: 'infra-bulk-cancel-2',
        tipo: 'ip',
        nome: 'Servidor Cancelado 2',
        valor_identificador: '10.0.0.22',
        unidade_id: 'unit-1',
      },
    ]);

    renderCatalogManager('infra_estrutura');

    await user.click(await screen.findByRole('checkbox', { name: 'Selecionar infraestrutura Servidor Cancelado 1' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar infraestrutura Servidor Cancelado 2' }));
    await user.click(screen.getByRole('button', { name: /Excluir selecionados/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Deseja realmente excluir 2 registro(s) de infraestrutura selecionado(s)?'
    );
    expect(catalogApi.infra_estrutura.remove).not.toHaveBeenCalled();
  });
});
