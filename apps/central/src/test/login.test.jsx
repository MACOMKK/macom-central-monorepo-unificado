import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Login from '@/pages/Login';

describe('Login page', () => {
  beforeEach(() => {
    // Testes nao devem depender do captcha real configurado no .env.local do dev
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');
    // "Lembrar meu acesso" persiste preferencia/email em localStorage -- isolar entre testes.
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('preenche o email padrao e envia credenciais com trim', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <Login
        onSubmit={onSubmit}
        loading={false}
        defaultEmail="  admin@macom.com  "
      />
    );

    await user.type(screen.getByLabelText('Senha'), 'Segredo123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('admin@macom.com', 'Segredo123', undefined, true);
    });
  });

  it('envia remember=false quando o checkbox "Lembrar meu acesso" e desmarcado', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<Login onSubmit={onSubmit} loading={false} />);

    await user.type(screen.getByLabelText('E-mail'), 'admin@macom.com');
    await user.type(screen.getByLabelText('Senha'), 'Segredo123');
    await user.click(screen.getByLabelText('Lembrar meu acesso'));
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('admin@macom.com', 'Segredo123', undefined, false);
    });
  });

  it('exibe erro quando o submit falha', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Credenciais invalidas.'));

    render(<Login onSubmit={onSubmit} loading={false} />);

    await user.type(screen.getByLabelText('E-mail'), 'admin@macom.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Credenciais invalidas.')).toBeInTheDocument();
  });

  it('desabilita campos e botao quando loading for true', () => {
    const onSubmit = vi.fn();

    render(<Login onSubmit={onSubmit} loading defaultEmail="admin@macom.com" />);

    expect(screen.getByLabelText('E-mail')).toBeDisabled();
    expect(screen.getByLabelText('Senha')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Carregando' })).toBeDisabled();
  });
});
