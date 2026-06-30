import { ExternalLink, KeyRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const consoleBaseUrl = import.meta.env.VITE_CONSOLE_URL || 'https://macom-console.vercel.app/';
const consoleAccessUrl = `${consoleBaseUrl.replace(/\/$/, '')}/acessos-sistemas`;

export default function SystemAccessMoved() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase text-primary">Governanca</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Acessos por Sistema</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Esta area esta sendo migrada para o MACOM Console, o novo app de gestao da plataforma.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Controle principal no MACOM Console</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Use o Console para liberar, bloquear ou remover acessos aos sistemas.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <a href={consoleAccessUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir Console
              </a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
