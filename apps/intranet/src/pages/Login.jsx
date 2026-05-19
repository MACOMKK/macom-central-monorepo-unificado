import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole, Mail } from 'lucide-react';
import { Button, Input, Label } from '@macom/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const INITIAL_SIGN_IN = { email: '', password: '' };

function getSignInErrorMessage(error) {
  if (error?.code === 'invalid_credentials' || error?.message === 'Invalid login credentials') {
    return 'E-mail ou senha incorretos.';
  }

  if (typeof error?.message === 'string' && error.message.toLowerCase().includes('missing sub claim')) {
    return 'Sua sessao esta invalida ou expirada. Faça login novamente.';
  }

  if (error?.code === 'INTRANET_COLLABORATOR_NOT_FOUND') {
    return 'Seu usuario autenticado nao esta vinculado a um colaborador da intranet.';
  }

  if (error?.code === 'INTRANET_COLLABORATOR_INACTIVE') {
    return 'Seu cadastro de colaborador esta inativo. Procure um administrador para reativar o acesso.';
  }

  if (error?.code === 'INTRANET_SYSTEM_ACCESS_NOT_GRANTED') {
    return 'Seu colaborador esta ativo, mas ainda nao possui acesso liberado para a intranet.';
  }

  return error?.message || 'Nao foi possivel entrar.';
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoadingAuth, authError, signIn } = useAuth();
  const [signInForm, setSignInForm] = useState(INITIAL_SIGN_IN);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = new URLSearchParams(location.search).get('redirectTo') || '/';

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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/70 bg-white/90 backdrop-blur p-8 shadow-xl shadow-slate-200/60">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <span className="text-lg font-bold">I</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Intranet</h1>
          <p className="mt-2 text-sm text-slate-600">Acesse comunicados, documentos e recursos internos em um so lugar.</p>
        </div>

        {authError?.message && (
          <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-900">
            <AlertDescription>
              {getSignInErrorMessage(authError)}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="signin-email"
                type="email"
                value={signInForm.email}
                onChange={(event) => setSignInForm((prev) => ({ ...prev, email: event.target.value }))}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">Senha</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="signin-password"
                type="password"
                value={signInForm.password}
                onChange={(event) => setSignInForm((prev) => ({ ...prev, password: event.target.value }))}
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}

