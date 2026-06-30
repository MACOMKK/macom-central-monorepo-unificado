import { BookOpen, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const consoleBaseUrl = import.meta.env.VITE_CONSOLE_URL || 'https://macom-console.vercel.app/';
const consoleGuideUrl = `${consoleBaseUrl.replace(/\/$/, '')}/guia`;

export default function PlatformGuideMoved() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase text-primary">Governanca</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Guia da Plataforma</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          O guia administrativo agora fica no MACOM Console, junto das configuracoes e controles da plataforma.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Documentacao principal no MACOM Console</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Consulte no Console os fluxos de uso, regras operacionais e orientacoes de governanca.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <a href={consoleGuideUrl} target="_blank" rel="noreferrer">
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
