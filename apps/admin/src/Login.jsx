import { AuthLoginCard } from '@macom/ui';

const logoUrl = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';
const bgUrl = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1779216591/fundo_mit_motors_in0y1d.webp';

export default function Login({ onSubmit, loading, defaultEmail = '' }) {
  return (
    <AuthLoginCard
      logoUrl={logoUrl}
      backgroundImageUrl={bgUrl}
      title="Console Macom"
      subtitle="Acesse a gestão da plataforma e dos sistemas."
      onSubmit={onSubmit}
      loading={loading}
      defaultEmail={defaultEmail}
    />
  );
}
