import { useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login({ onSubmit, loading, defaultEmail = '' }) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await onSubmit(email.trim(), password);
    } catch (submitError) {
      setError(submitError.message || 'Falha ao entrar.');
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(136,19,55,0.16),_transparent_32%),linear-gradient(180deg,#faf6f2_0%,#f4f4f5_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="hidden rounded-[32px] bg-slate-950 p-10 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">MACOM</p>
              <h1 className="max-w-lg text-5xl font-black leading-tight">
                Catalogo operacional conectado ao novo Supabase.
              </h1>
              <p className="max-w-md text-sm leading-6 text-white/70">
                Acesso enxuto para departamentos, unidades, colaboradores e ativos.
              </p>
            </div>

            <div className="grid gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div>
                <p className="text-sm text-white/60">Escopo liberado agora</p>
                <p className="mt-2 text-2xl font-bold">Departamentos, Unidades e Colaboradores</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-lg font-bold">1</p>
                  <p className="text-xs text-white/60">Login</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-lg font-bold">3</p>
                  <p className="text-xs text-white/60">Tabelas</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-lg font-bold">0</p>
                  <p className="text-xs text-white/60">Ativos</p>
                </div>
              </div>
            </div>
          </section>

          <Card className="border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <CardHeader className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#881337] text-white">
                <LogIn className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black tracking-tight">Entrar</CardTitle>
                <CardDescription className="mt-2 text-sm leading-6">
                  Use seu usuario do Supabase Auth para acessar o sistema.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@empresa.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Sua senha"
                    required
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Acessar sistema'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
