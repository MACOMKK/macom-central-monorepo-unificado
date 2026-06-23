import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, Wifi } from 'lucide-react';
import { Alert, AlertDescription, Button, Input, Label } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const INITIAL_SIGN_IN = { email: '', password: '' };
const LOGO_URL = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';
const LOGIN_BG_URL = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1779212740/Macom_fundo_xaaynv.webp';

function getSignInErrorMessage(error) {
  if (typeof error?.message === 'string' && error.message.toLowerCase().includes('auth session missing')) {
    return null;
  }

  if (error?.code === 'invalid_credentials' || error?.message === 'Invalid login credentials') {
    return 'E-mail ou senha incorretos.';
  }

  if (typeof error?.message === 'string' && error.message.toLowerCase().includes('missing sub claim')) {
    return 'Sua sessão está inválida ou expirada. Faça login novamente.';
  }

  if (error?.code === 'INTRANET_COLLABORATOR_NOT_FOUND') {
    return 'Seu usuário autenticado não está vinculado a um colaborador da intranet.';
  }

  if (error?.code === 'INTRANET_COLLABORATOR_INACTIVE') {
    return 'Seu cadastro de colaborador esta inativo. Procure um administrador para reativar o acesso.';
  }

  if (error?.code === 'INTRANET_SYSTEM_ACCESS_NOT_GRANTED') {
    return 'Seu colaborador está ativo, mas ainda não possui acesso liberado para a intranet.';
  }

  return error?.message || 'Não foi possível entrar.';
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoadingAuth, authError, signIn, checkUserAuth } = useAuth();
  const [signInForm, setSignInForm] = useState(INITIAL_SIGN_IN);
  const [submitting, setSubmitting] = useState(false);
  const [trustedIpSubmitting, setTrustedIpSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = new URLSearchParams(location.search).get('redirectTo') || '/';
  const authErrorMessage = authError?.source === 'sign_in' ? getSignInErrorMessage(authError) : null;

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSignIn = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await signIn(signInForm);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(getSignInErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrustedIpAccess = async () => {
    setTrustedIpSubmitting(true);
    try {
      const currentUser = await checkUserAuth({ forceTrustedIpAccess: true });
      if (!currentUser) {
        throw new Error('trusted_ip_access_denied');
      }
      navigate(redirectTo, { replace: true });
    } catch {
      toast.error('Esta rede nao esta liberada para acesso automatico.');
    } finally {
      setTrustedIpSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.22), rgba(15, 23, 42, 0.22)), url(${LOGIN_BG_URL})`,
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
            <img src={LOGO_URL} alt="MACOM" className="mx-auto mb-4 h-14 w-14 object-contain" />
            <h1 className="text-2xl font-bold text-white">Intranet Macom</h1>
            <p className="mt-2 text-sm text-white/80">Acesse comunicados, documentos e recursos internos em um so lugar.</p>
          </div>

          {authErrorMessage && (
            <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-900">
              <AlertDescription>
                {authErrorMessage}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email" className="text-white/90">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
                <Input
                  id="signin-email"
                  type="email"
                  value={signInForm.email}
                  onChange={(event) => setSignInForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="border-white/65 bg-white/20 pl-10 text-white placeholder:text-white/55"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password" className="text-white/90">Senha</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
                <Input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={signInForm.password}
                  onChange={(event) => setSignInForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="border-white/65 bg-white/20 pl-10 pr-11 text-white placeholder:text-white/55"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-white/70 transition-colors hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
            </Button>
          </form>

          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              className="w-full border border-white/50 bg-white/20 text-white hover:bg-white/30"
              disabled={trustedIpSubmitting || submitting}
              onClick={handleTrustedIpAccess}
            >
              {trustedIpSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              Acessar pela rede liberada
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
