import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Wifi } from 'lucide-react';
import { AuthLoginCard, Button, Spinner } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

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
  const [trustedIpSubmitting, setTrustedIpSubmitting] = useState(false);

  const redirectTo = new URLSearchParams(location.search).get('redirectTo') || '/';
  const authErrorMessage = authError?.source === 'sign_in' ? getSignInErrorMessage(authError) : '';

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (email, password, captchaToken) => {
    try {
      await signIn({ email, password, captchaToken });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      throw new Error(getSignInErrorMessage(error) || 'Não foi possível entrar.');
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
    <AuthLoginCard
      logoUrl={LOGO_URL}
      backgroundImageUrl={LOGIN_BG_URL}
      title="Intranet Macom"
      subtitle="Acesse comunicados, documentos e recursos internos em um so lugar."
      onSubmit={handleSubmit}
      error={authErrorMessage}
      extraAction={
        <Button
          type="button"
          variant="secondary"
          className="w-full border border-white/50 bg-white/20 text-white hover:bg-white/30"
          disabled={trustedIpSubmitting}
          onClick={handleTrustedIpAccess}
        >
          {trustedIpSubmitting ? <Spinner size="sm" /> : <Wifi className="h-4 w-4" />}
          Acessar pela rede liberada
        </Button>
      }
    />
  );
}
