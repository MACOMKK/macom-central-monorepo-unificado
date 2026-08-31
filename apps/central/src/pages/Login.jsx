import { AuthLoginCard } from '@macom/ui';

const logoUrl = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';
const bgUrl = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1779216591/fundo_mit_motors_in0y1d.webp';
const prefetchDashboardRoute = () => import('@/pages/Dashboard');

export default function Login({ onSubmit, loading, defaultEmail = '' }) {
  const handleSubmit = async (email, password, captchaToken, remember) => {
    void prefetchDashboardRoute();
    await onSubmit(email, password, captchaToken, remember);
  };

  return (
    <AuthLoginCard
      logoUrl={logoUrl}
      backgroundImageUrl={bgUrl}
      title="Central Macom"
      subtitle="Acesse o painel administrativo da plataforma."
      onSubmit={handleSubmit}
      loading={loading}
      defaultEmail={defaultEmail}
    />
  );
}
