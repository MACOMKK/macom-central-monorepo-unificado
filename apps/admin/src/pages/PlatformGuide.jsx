import {
  BookOpen,
  Building2,
  CheckCircle2,
  FileText,
  Gauge,
  KeyRound,
  Megaphone,
  MonitorCog,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { Badge, Card } from '@macom/ui';

import PageHeader from '@/components/PageHeader';

const overviewItems = [
  {
    title: 'Central',
    description: 'Administra operacao de estoque, colaboradores, ativos, termos, contatos, linhas e infraestrutura.',
    icon: MonitorCog,
  },
  {
    title: 'Console',
    description: 'Centraliza sistemas, acessos, permissoes, usuarios, auditoria e configuracoes da plataforma.',
    icon: ShieldCheck,
  },
  {
    title: 'Intranet',
    description: 'Organiza avisos, documentos, links uteis, eventos e comunicacao interna.',
    icon: Megaphone,
  },
  {
    title: 'Relatorios',
    description: 'Entrega dashboards e indicadores com controle de acesso por nivel.',
    icon: Gauge,
  },
];

const guideSections = [
  {
    title: '1. Cadastrar o colaborador na Central',
    description: 'Mantenha dados operacionais, unidade, cargo, departamento e status do colaborador na Central.',
    image: 'collaborators',
    steps: ['Acesse Colaboradores na Central', 'Crie ou edite o cadastro', 'Revise dados operacionais'],
  },
  {
    title: '2. Liberar acesso no Console',
    description: 'Use o Console para controlar em quais sistemas o colaborador pode entrar e com qual nivel.',
    image: 'access',
    steps: ['Acesse Acessos no Console', 'Selecione colaborador e sistema', 'Defina usuario, gestor ou admin'],
  },
  {
    title: '3. Ajustar permissoes por sistema',
    description: 'Administradores configuram os modulos que gestores podem visualizar ou gerenciar.',
    image: 'permissions',
    steps: ['Abra Permissoes', 'Escolha o sistema', 'Salve os niveis liberados'],
  },
  {
    title: '4. Operar a comunicacao interna',
    description: 'Publique avisos, organize documentos por empresa e disponibilize links ou eventos para colaboradores.',
    image: 'intranet',
    steps: ['Publique comunicados', 'Anexe documentos', 'Acompanhe conteudos ativos'],
  },
];

const rules = [
  'Apenas administradores devem conceder acesso admin.',
  'Gestores podem receber permissoes especificas, mas nao administram niveis elevados.',
  'Usuarios comuns acessam somente sistemas e conteudos liberados.',
  'Cadastro operacional do colaborador permanece na Central.',
  'Acessos, permissoes, e-mail de login e senha devem ser administrados pelo Console.',
];

const futureItems = [
  'Schema dedicado para governanca da plataforma.',
  'Permissoes detalhadas por relatorio.',
  'Rotinas automaticas de arquivamento e notificacao.',
  'Configuracoes globais por sistema.',
];

function GuideVisual({ type }) {
  const config = {
    collaborators: {
      title: 'Colaboradores',
      icon: UsersRound,
      rows: ['Cadastro operacional', 'Unidade e cargo', 'Status funcional'],
      accent: 'bg-info',
    },
    access: {
      title: 'Acessos',
      icon: KeyRound,
      rows: ['Central: admin', 'Relatorios: usuario', 'Intranet: gestor'],
      accent: 'bg-success',
    },
    permissions: {
      title: 'Permissoes',
      icon: ShieldCheck,
      rows: ['Ativos: gerenciar', 'Colaboradores: ver', 'Logs: ver'],
      accent: 'bg-warning',
    },
    intranet: {
      title: 'Intranet',
      icon: Megaphone,
      rows: ['Aviso publicado', 'Documento interno', 'Evento agendado'],
      accent: 'bg-destructive',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm" role="img" aria-label={`Imagem guia ${config.title}`}>
      <div className="flex items-center gap-2 border-b border-border bg-muted/35 px-4 py-3">
        <span className={`h-3 w-3 rounded-full ${config.accent}`} />
        <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
        <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
        <span className="ml-auto text-[10px] font-semibold uppercase text-muted-foreground">Guia visual</span>
      </div>
      <div className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
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
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Documentacao administrativa"
        title="Guia da Plataforma"
        description="Material interno para administradores consultarem a estrutura dos sistemas, os modulos disponiveis e os principais fluxos de governanca da plataforma."
        actions={
          <Badge variant="outline" className="gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            Guia
          </Badge>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="p-5">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Building2 className="h-5 w-5 text-primary" />
            Objetivo operacional
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              A plataforma centraliza processos internos, reduz controles manuais e melhora a organizacao das
              informacoes corporativas. A estrutura modular permite evoluir Central, Console, Relatorios e Intranet de
              forma independente.
            </p>
            <p>
              A Central fica focada na operacao de estoque e cadastros de apoio, enquanto o Console concentra a
              governanca dos sistemas.
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Controle de acesso
          </h2>
          <div className="mt-4 space-y-3">
            {['Admin: acesso total', 'Gestor: acesso configuravel', 'Usuario: acesso limitado'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Forma de uso</h2>
          <p className="mt-1 text-sm text-muted-foreground">Fluxo recomendado para operar a plataforma com seguranca.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {guideSections.map((section) => (
            <Card key={section.title} className="p-5">
              <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
                <GuideVisual type={section.image} />
                <div>
                  <h3 className="text-base font-bold text-foreground">{section.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
                  <div className="mt-4 space-y-2">
                    {section.steps.map((step) => (
                      <div key={step} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <FileText className="h-5 w-5 text-primary" />
            Regras operacionais
          </h2>
          <div className="mt-4 space-y-3">
            {rules.map((rule) => (
              <div key={rule} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold text-foreground">Evolucoes futuras</h2>
          <div className="mt-4 space-y-3">
            {futureItems.map((item) => (
              <div key={item} className="rounded-md border border-border bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
