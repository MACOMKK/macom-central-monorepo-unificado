import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';

import { Alert, AlertDescription } from './alert';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Spinner } from './spinner';
import { TurnstileWidget } from './turnstile-widget';

export function AuthLoginCard({
  logoUrl,
  backgroundImageUrl,
  title,
  subtitle,
  onSubmit,
  loading = false,
  error = '',
  defaultEmail = '',
  footer,
  extraAction,
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const isBusy = loading || submitting;
  const displayError = error || localError;
  const captchaRequired = Boolean(turnstileSiteKey);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isBusy) return;
    if (captchaRequired && !captchaToken) {
      setLocalError('Confirme que voce nao e um robo.');
      return;
    }

    setLocalError('');
    setSubmitting(true);
    try {
      await (captchaToken ? onSubmit(email.trim(), password, captchaToken) : onSubmit(email.trim(), password));
    } catch (submitError) {
      setLocalError(submitError.message || 'Falha ao entrar.');
      setCaptchaToken('');
      setCaptchaKey((current) => current + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.22), rgba(15, 23, 42, 0.22)), url(${backgroundImageUrl})`,
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
            {logoUrl ? <img src={logoUrl} alt="MACOM" className="mx-auto mb-4 h-14 w-14 object-contain" /> : null}
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-white/80">{subtitle}</p> : null}
          </div>

          {displayError ? (
            <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-900">
              <AlertDescription>{displayError}</AlertDescription>
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
                  autoComplete="email"
                  autoFocus
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
                  autoComplete="current-password"
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

            {captchaRequired ? (
              <TurnstileWidget
                key={captchaKey}
                siteKey={turnstileSiteKey}
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken('')}
              />
            ) : null}

            <Button type="submit" className="w-full" disabled={isBusy || (captchaRequired && !captchaToken)}>
              {isBusy ? <Spinner size="sm" /> : 'Entrar'}
            </Button>
          </form>

          {extraAction ? <div className="mt-4">{extraAction}</div> : null}

          {footer ? <p className="mt-6 text-center text-xs text-white/70">{footer}</p> : null}
        </div>
      </div>
    </div>
  );
}
