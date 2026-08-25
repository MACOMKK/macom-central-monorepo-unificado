import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthLoginCard } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';

const LOGO_URL = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';
// TODO: trocar por uma imagem de fundo propria do comunicacao (placeholder reaproveitado de admin/central)
const BG_URL = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1779216591/fundo_mit_motors_in0y1d.webp';

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

  const redirectTo = new URLSearchParams(location.search).get('redirectTo') || '/';

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (email, password, captchaToken) => {
    try {
      await login(email, password, captchaToken);
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      throw new Error(getLoginErrorMessage(submitError));
    }
  };

  return (
    <AuthLoginCard
      logoUrl={LOGO_URL}
      backgroundImageUrl={BG_URL}
      title="Comunicação MACOM"
      subtitle="Entre para conversar com os canais da empresa"
      onSubmit={handleSubmit}
    />
  );
}
