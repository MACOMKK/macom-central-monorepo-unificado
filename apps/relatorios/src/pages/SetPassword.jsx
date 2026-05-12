import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function SetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Senha inválida', description: 'Use pelo menos 8 caracteres.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Senha inválida', description: 'As senhas não conferem.' });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Não foi possível definir a senha',
        description: error.message
      });
      return;
    }

    toast({ title: 'Senha definida com sucesso!' });
    navigate('/', { replace: true });
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f2f2f2' }}>
      <div className="w-full max-w-md bg-white p-8" style={{ borderTop: '4px solid #E30613' }}>
        <h1 className="font-black text-lg uppercase tracking-widest mb-2">Definir Senha</h1>
        <p className="text-xs mb-6" style={{ color: '#666' }}>
          Primeiro acesso: escolha sua senha para entrar no sistema.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest">Nova senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest">Confirmar senha</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Salvando...' : 'Salvar senha'}
          </Button>
        </form>
      </div>
    </div>
  );
}
