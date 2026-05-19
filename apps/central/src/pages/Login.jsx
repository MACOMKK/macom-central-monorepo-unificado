import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const logoUrl = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';
const bgUrl = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1779216591/fundo_mit_motors_in0y1d.webp';
const prefetchDashboardRoute = () => import('@/pages/Dashboard');

export default function Login({ onSubmit, loading, defaultEmail = '' }) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isBusy = loading || submitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isBusy) return;

    setError('');
    setSubmitting(true);

    try {
      void prefetchDashboardRoute();
      await onSubmit(email.trim(), password);
    } catch (submitError) {
      setError(submitError.message || 'Falha ao entrar.');
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center overflow-hidden px-4 py-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />
      <div className="absolute inset-0 bg-black/72" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(193,18,31,0.25),transparent_45%)]" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.04)] p-7 shadow-2xl backdrop-blur-[12px] sm:p-8">
        <div className="mb-7 border-b border-white/30 pb-5 text-center">
          <img src={logoUrl} alt="MACOM" className="mx-auto h-14 w-auto object-contain" />
          <p className="mt-4 text-xs text-white/90 sm:text-[13px]">Acesse o painel administrativo.</p>
        </div>

        <form className="mx-auto w-full max-w-sm space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-[11px] font-semibold tracking-wide text-white/90">
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
              required
              disabled={isBusy}
              className="h-11 w-full rounded-md border border-white/40 bg-white/85 px-3 text-sm text-zinc-900 placeholder:text-sm placeholder:text-zinc-500 focus:border-white/70 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-[11px] font-semibold tracking-wide text-white/90">
              SENHA
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha"
                required
                disabled={isBusy}
                className="h-11 w-full rounded-md border border-white/40 bg-white/85 px-3 pr-11 text-sm text-zinc-900 placeholder:text-sm placeholder:text-zinc-500 focus:border-white/70 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={isBusy}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-500 transition hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-red-300/70 bg-red-50/90 px-3 py-2 text-xs sm:text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button type="button" className="text-[11px] text-white/90 underline underline-offset-2">
            Esqueci minha senha
          </button>

          <button
            type="submit"
            disabled={isBusy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#c1121f] text-sm font-semibold text-white transition hover:bg-[#a30f19] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
