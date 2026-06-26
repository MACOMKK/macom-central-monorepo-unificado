import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const consoleBaseUrl = import.meta.env.VITE_CONSOLE_URL || 'http://localhost:5170';
const consolePermissionsUrl = `${consoleBaseUrl.replace(/\/$/, '')}/permissoes-sistemas`;

export default function SystemPermissionsMoved() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase text-primary">Governanca</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Permissoes dos Sistemas</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Esta area esta sendo migrada para o MACOM Console, o novo app de gestao da plataforma.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Controle principal no MACOM Console</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Use o Console para administrar permissoes de sistemas. A tela antiga continua disponivel
                temporariamente como fallback durante a validacao.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <a href={consolePermissionsUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir Console
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/permissoes-sistemas-legado">Acessar legado</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
