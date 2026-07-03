import { useState } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { Alert, AlertDescription, Button, Input, Label } from '@macom/ui';

const logoUrl = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';
const bgUrl = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1779216591/fundo_mit_motors_in0y1d.webp';

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
      await onSubmit(email.trim(), password);
    } catch (submitError) {
      setError(submitError.message || 'Falha ao entrar.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.22), rgba(15, 23, 42, 0.22)), url(${bgUrl})`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white/82 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-lg">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/85" />

        <div className="relative">
          <div className="mb-8 text-center">
            <img src={logoUrl} alt="MACOM" className="mx-auto mb-4 h-14 w-14 object-contain" />
            <h1 className="text-2xl font-bold text-white">Console Macom</h1>
            <p className="mt-2 text-sm text-white/80">Acesse a gestao da plataforma e dos sistemas.</p>
          </div>

          {error ? (
            <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-900">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="border-white/65 bg-white/20 pl-10 text-white placeholder:text-white/55"
                  required
                  disabled={isBusy}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90">Senha</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="border-white/65 bg-white/20 pl-10 pr-11 text-white placeholder:text-white/55"
                  required
                  disabled={isBusy}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isBusy}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-white/70 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isBusy}>
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
