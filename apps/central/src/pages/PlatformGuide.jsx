import { BookOpen, Building2, CheckCircle2, FileText, Gauge, KeyRound, Megaphone, MonitorCog, ShieldCheck, UsersRound } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const overviewItems = [
  {
    title: 'Central',
    description: 'Administra colaboradores, ativos, acessos, termos, infraestrutura e permissoes.',
    icon: MonitorCog,
  },
  {
    title: 'Relatorios',
    description: 'Organiza dashboards e indicadores com controle de acesso por nivel.',
    icon: Gauge,
  },
  {
    title: 'Intranet',
    description: 'Centraliza avisos, documentos, links uteis, eventos e comunicacao interna.',
    icon: Megaphone,
  },
];

const guideSections = [
  {
    title: '1. Configurar colaboradores',
    description: 'Cadastre o colaborador, mantenha dados atualizados e defina status, unidade, cargo e funcao.',
    image: 'collaborators',
    steps: ['Acesse Colaboradores', 'Crie ou edite o cadastro', 'Revise funcao e status'],
  },
  {
    title: '2. Liberar acesso aos sistemas',
    description: 'Use Acessos Sistemas para definir se o colaborador acessa Relatorios, Intranet ou outros sistemas ativos.',
    image: 'access',
    steps: ['Selecione colaborador', 'Escolha sistema', 'Defina usuario ou gestor'],
  },
  {
    title: '3. Ajustar permissoes',
    description: 'Administradores configuram o que gestores podem visualizar ou gerenciar nos modulos da plataforma.',
    image: 'permissions',
    steps: ['Abra Permissoes', 'Revise modulos', 'Salve os niveis liberados'],
  },
  {
    title: '4. Operar a intranet',
    description: 'Publique avisos, organize documentos por empresa e disponibilize links ou eventos para os colaboradores.',
    image: 'intranet',
    steps: ['Publique comunicados', 'Anexe documentos', 'Acompanhe conteudos ativos'],
  },
];

const rules = [
  'Apenas administradores podem conceder acesso admin.',
  'Gestores podem receber permissoes especificas, mas nao administram niveis elevados.',
  'Usuarios comuns acessam somente sistemas e conteudos liberados.',
  'Avisos expirados ficam ocultos para usuarios comuns e visiveis para administradores.',
  'Eventos e avisos so podem ser alterados pelo criador ou por um administrador.',
];

const futureItems = [
  'Acesso automatico a Intranet dentro da rede da empresa.',
  'Armazenamento dedicado para imagens, videos e arquivos maiores.',
  'Permissoes detalhadas por relatorio.',
  'Rotinas automaticas de arquivamento e notificacao.',
];

function GuideVisual({ type }) {
  const config = {
    collaborators: {
      title: 'Colaboradores',
      icon: UsersRound,
      rows: ['Kevin teste usuario', 'Maria Financeiro', 'Joao TI'],
      accent: 'bg-blue-500',
    },
    access: {
      title: 'Acessos Sistemas',
      icon: KeyRound,
      rows: ['Intranet: gestor', 'Relatorios: usuario', 'Central: admin'],
      accent: 'bg-emerald-500',
    },
    permissions: {
      title: 'Permissoes',
      icon: ShieldCheck,
      rows: ['Ativos: gerenciar', 'Colaboradores: ver', 'Logs: ver'],
      accent: 'bg-amber-500',
    },
    intranet: {
      title: 'Intranet',
      icon: Megaphone,
      rows: ['Aviso publicado', 'Documento Mitsubishi', 'Evento agendado'],
      accent: 'bg-rose-500',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm" role="img" aria-label={`Imagem guia ${config.title}`}>
      <div className="flex items-center gap-2 border-b border-border bg-muted/35 px-4 py-3">
        <span className={`h-3 w-3 rounded-full ${config.accent}`} />
        <span className="h-3 w-3 rounded-full bg-slate-300" />
        <span className="h-3 w-3 rounded-full bg-slate-300" />
        <span className="ml-auto text-[10px] font-semibold uppercase text-muted-foreground">Guia visual</span>
      </div>
      <div className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{config.title}</p>
            <p className="text-xs text-muted-foreground">Fluxo administrativo</p>
          </div>
        </div>
        <div className="space-y-2">
          {config.rows.map((row) => (
            <div key={row} className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
              <span className={`h-2.5 w-2.5 rounded-full ${config.accent}`} />
              <span className="text-xs font-medium text-foreground">{row}</span>
              <span className="ml-auto h-2 w-14 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PlatformGuide() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            Documentacao administrativa
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Guia Comercial e de Uso da Plataforma</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Material interno para administradores consultarem a estrutura do sistema, os modulos disponiveis e os
            principais fluxos de utilizacao.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {overviewItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Objetivo comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              A plataforma centraliza processos internos, reduz controles manuais e melhora a organizacao das
              informacoes corporativas. A estrutura modular permite evoluir Central, Relatorios e Intranet de forma
              independente.
            </p>
            <p>
              O resultado esperado e mais controle para administradores, mais clareza para gestores e acesso rapido as
              informacoes essenciais para os colaboradores.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Controle de acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {['Admin: acesso total', 'Gestor: acesso configuravel', 'Usuario: acesso limitado'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Forma de uso</h2>
          <p className="mt-1 text-sm text-muted-foreground">Fluxo recomendado para operar a plataforma com seguranca.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {guideSections.map((section) => (
            <Card key={section.title}>
              <CardContent className="grid gap-5 p-5 md:grid-cols-[0.9fr_1.1fr]">
                <GuideVisual type={section.image} />
                <div>
                  <h3 className="text-base font-bold text-foreground">{section.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
                  <div className="mt-4 space-y-2">
                    {section.steps.map((step) => (
                      <div key={step} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Regras operacionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rules.map((rule) => (
              <div key={rule} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{rule}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolucoes futuras</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {futureItems.map((item) => (
              <div key={item} className="rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
