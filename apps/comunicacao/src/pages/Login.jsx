import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription, Button, Input, Label } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';

const LOGO_URL = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';

const FLOATING_BUBBLES = [
  { className: 'left-[8%] top-[18%] h-14 w-24', delay: '0s' },
  { className: 'right-[10%] top-[12%] h-10 w-32', delay: '0.6s' },
  { className: 'left-[14%] bottom-[22%] h-10 w-20', delay: '1.2s' },
  { className: 'right-[6%] bottom-[16%] h-16 w-28', delay: '1.8s' },
];

function getLoginErrorMessage(error) {
  if (error?.code === 'invalid_credentials' || error?.message === 'Invalid login credentials') {
    return 'E-mail ou senha incorretos.';
  }
  return error?.message || 'Nao foi possivel entrar.';
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoadingAuth, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = new URLSearchParams(location.search).get('redirectTo') || '/';

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(getLoginErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1120] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.16),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(59,130,246,0.14),transparent_45%)]" />

      {FLOATING_BUBBLES.map((bubble, index) => (
        <span
          key={index}
          className={`pointer-events-none absolute animate-float rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm ${bubble.className}`}
          style={{ animationDelay: bubble.delay }}
        />
      ))}

      <div className="relative w-full max-w-md">
        <div className="relative rounded-[2rem] rounded-bl-md border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
              <img src={LOGO_URL} alt="MACOM" className="h-9 w-9 object-contain" />
              <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30">
                <MessageCircle className="h-3.5 w-3.5" />
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">Comunicação MACOM</h1>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-white/60">
              Entre para conversar com os canais da empresa
              <span className="flex gap-0.5">
                <span className="h-1 w-1 animate-typing-dot rounded-full bg-white/60" style={{ animationDelay: '0s' }} />
                <span className="h-1 w-1 animate-typing-dot rounded-full bg-white/60" style={{ animationDelay: '0.2s' }} />
                <span className="h-1 w-1 animate-typing-dot rounded-full bg-white/60" style={{ animationDelay: '0.4s' }} />
              </span>
            </p>
          </div>

          {error ? (
            <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-900">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/35 focus-visible:border-red-400/60 focus-visible:ring-red-400/20"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70">Senha</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="border-white/10 bg-white/5 pl-10 pr-11 text-white placeholder:text-white/35 focus-visible:border-red-400/60 focus-visible:ring-red-400/20"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={submitting}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-white/40 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 rounded-full bg-red-500 hover:bg-red-600"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  Entrar
                  <MessageCircle className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <div
          className="absolute -bottom-2 left-10 h-5 w-5 rotate-45 rounded-sm border-b border-r border-white/10 bg-slate-900/70 backdrop-blur-xl"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
