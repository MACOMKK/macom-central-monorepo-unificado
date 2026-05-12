import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { dataClient } from '@/api/dataClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const MACOM_LOGO_URL = 'https://svlhklfzwtcvaospmhxy.supabase.co/storage/v1/object/public/Imagens%20macom/image_macom.png';

const getFromPath = (search) => {
  const params = new URLSearchParams(search);
  const from = params.get('from');
  if (!from) return '/';
  try {
    const decoded = decodeURIComponent(from);
    return decoded.startsWith('/') ? decoded : '/';
  } catch {
    return '/';
  }
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverCooldownUntil, setRecoverCooldownUntil] = useState(0);

  const onSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Falha no login',
        description: error.message
      });
      return;
    }
    try {
      await dataClient.auth.me();
    } catch (authCheckError) {
      toast({
        title: 'Acesso indisponivel',
        description: authCheckError.message || 'Nao foi possivel concluir o login.'
      });
      return;
    }

    navigate(getFromPath(location.search), { replace: true });
    window.location.reload();
  };

  const handleRecoverPassword = async () => {
    const now = Date.now();
    if (recoverCooldownUntil > now) {
      const remainingSeconds = Math.ceil((recoverCooldownUntil - now) / 1000);
      toast({
        title: 'Aguarde para tentar novamente',
        description: `Tente de novo em ${remainingSeconds}s.`
      });
      return;
    }

    if (!email) {
      toast({ title: 'Informe seu email', description: 'Digite o email para recuperar a senha.' });
      return;
    }

    setIsRecovering(true);
    const redirectTo = `${window.location.origin}/set-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setIsRecovering(false);

    if (error) {
      const message = (error.message || '').toLowerCase();
      if (message.includes('rate limit')) {
        const cooldownMs = 60 * 1000;
        setRecoverCooldownUntil(Date.now() + cooldownMs);
        toast({
          title: 'Limite de envio atingido',
          description: 'Aguarde 1 minuto e tente novamente.'
        });
        return;
      }

      toast({ title: 'Falha ao enviar recuperacao', description: error.message });
      return;
    }

    setRecoverCooldownUntil(Date.now() + 60 * 1000);

    toast({
      title: 'Email de recuperacao enviado',
      description: 'Verifique sua caixa de entrada para redefinir a senha.'
    });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2" style={{ background: '#f3f3f3' }}>
      <section
        className="hidden lg:flex flex-col justify-between p-14"
        style={{
          background:
            'radial-gradient(circle at 15% 85%, rgba(227,6,19,0.35), transparent 35%), radial-gradient(circle at 80% 15%, rgba(227,6,19,0.3), transparent 35%), linear-gradient(135deg, #05070c 0%, #0a0a0a 60%, #120406 100%)'
        }}
      >
        <div className="flex items-center gap-4">
          <img src={MACOM_LOGO_URL} alt="MACOM" className="w-16 h-14 object-cover" />
          <div>
            <h1 className="text-white font-black text-xl tracking-widest uppercase">MACOM</h1>
            <p className="text-lg" style={{ color: '#b6b6b6' }}>Business Intelligence</p>
          </div>
        </div>

        <div className="max-w-xl">
          <h2 className="text-5xl leading-[1.05] font-black mb-6" style={{ color: '#f2f2f2' }}>
            Decisões mais
            <br />
            <span style={{ color: '#ff1c1c' }}>inteligentes.</span>
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: '#c9c9c9' }}>
            Plataforma interna de visualização de relatórios Power BI com permissões por unidade e cargo.
          </p>
        </div>

        <p className="text-sm" style={{ color: '#8f8f8f' }}>
          © Macom Mitsubishi · Belém · Ananindeua · Paragominas
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10" style={{ background: '#f3f3f3' }}>
        <div className="w-full max-w-xl">
          <div className="mb-8 lg:mb-12">
            <p className="text-xs sm:text-sm" style={{ color: '#5d6670' }}>
              Use as credenciais fornecidas pelo administrador.
            </p>
          </div>

          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#8d8d8d' }}>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu.nome@macom.com.br"
                className="h-12 text-base border border-[#d6d6d6] bg-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#8d8d8d' }}>Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 text-base border border-[#d6d6d6] bg-transparent"
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-sm font-bold" style={{ background: '#f50914' }}>
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>

            <button
              type="button"
              onClick={handleRecoverPassword}
              disabled={isRecovering || recoverCooldownUntil > Date.now()}
              className="w-full text-xs font-bold uppercase tracking-widest"
              style={{ color: '#141414' }}
            >
              {isRecovering ? 'Enviando recuperacao...' : 'Esqueci minha senha'}
            </button>
          </form>

          <p className="text-xs mt-10 text-center" style={{ color: '#5d6670' }}>
            Não possui acesso? Solicite ao administrador do sistema.
          </p>
        </div>
      </section>
    </div>
  );
}
