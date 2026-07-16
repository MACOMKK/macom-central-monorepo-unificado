import { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail } from 'lucide-react';

import { Button, Input, Label, useToast } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';

export default function Login({ loading = false }) {
  const { authError, login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isBusy = loading || submitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isBusy) return;

    setSubmitting(true);
    try {
      await login(email, password);
    } catch (error) {
      toast({
        title: 'Acesso indisponivel',
        description: error.message || 'Nao foi possivel entrar no sistema de pagamentos.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Acessar Pagamentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use o mesmo login interno da MACOM</p>
        </div>

        {authError?.type === 'config' && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {authError.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="seu.nome@macom.com.br"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={isBusy}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="h-11 w-full font-medium" disabled={isBusy}>
            {isBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Sem acesso ao sistema de pagamentos? Solicite a liberacao ao administrador.
        </p>
      </div>
    </main>
  );
}
