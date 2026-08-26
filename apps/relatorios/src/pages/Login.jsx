import { AuthLoginCard } from '@macom/ui';
import { checkLoginLock, reportFailedLogin, reportLoginSuccess, supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { MACOM_LOGO_URL } from '@/config/branding';

const prefetchDashboardRoute = () => import('@/pages/Dashboard');

// TODO: trocar por uma imagem de fundo propria do relatorios (placeholder reaproveitado de admin/central)
const BG_URL = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1779216591/fundo_mit_motors_in0y1d.webp';

export default function Login({ loading = false }) {
  const { checkUserAuth } = useAuth();

  const handleSubmit = async (email, password, captchaToken) => {
    void prefetchDashboardRoute();
    const lock = await checkLoginLock(email, 'relatorios');
    if (lock.locked) throw new Error(lock.message);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });

    if (error) {
      reportFailedLogin(email, 'relatorios');
      throw new Error(error.message);
    }

    reportLoginSuccess('relatorios');

    try {
      await checkUserAuth(data?.session || null, { force: true });
    } catch (authCheckError) {
      throw new Error(authCheckError.message || 'Não foi possível concluir o login.');
    }
  };

  return (
    <AuthLoginCard
      logoUrl={MACOM_LOGO_URL}
      backgroundImageUrl={BG_URL}
      title="MACOM Business Intelligence"
      subtitle="Use as credenciais fornecidas pelo administrador."
      onSubmit={handleSubmit}
      loading={loading}
      footer="Não possui acesso? Solicite ao administrador do sistema."
    />
  );
}
