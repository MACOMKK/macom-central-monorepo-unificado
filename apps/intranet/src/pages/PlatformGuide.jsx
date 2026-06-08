import React from 'react';
import {
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Gauge,
  KeyRound,
  Link2,
  Megaphone,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';

const modules = [
  {
    title: 'Mural de Avisos',
    description: 'Comunicados internos com imagem, prioridade, fixacao, agendamento e expiracao.',
    icon: Megaphone,
  },
  {
    title: 'Documentos',
    description: 'Arquivos organizados por empresa, categoria e estrutura de pastas.',
    icon: FileText,
  },
  {
    title: 'Links Uteis',
    description: 'Atalhos limpos para ferramentas usadas na rotina dos colaboradores.',
    icon: Link2,
  },
  {
    title: 'Calendario',
    description: 'Eventos internos com controle de criador e permissao administrativa.',
    icon: CalendarDays,
  },
];

const guideSteps = [
  {
    title: '1. Liberar acesso',
    description: 'O acesso a Intranet e concedido pela Central, em Acessos Sistemas, usando nivel usuario, gestor ou admin.',
    visual: 'access',
    items: ['Selecionar colaborador', 'Selecionar sistema Intranet', 'Definir nivel de acesso'],
  },
  {
    title: '2. Definir permissoes',
    description: 'Administradores ajustam quais modulos cada colaborador pode visualizar ou editar.',
    visual: 'permissions',
    items: ['Sem acesso', 'Ver conteudo', 'Editar conteudo'],
  },
  {
    title: '3. Publicar comunicados',
    description: 'Avisos podem ser publicados imediatamente, agendados ou expirados para sair da visao dos usuarios comuns.',
    visual: 'announcements',
    items: ['Criar aviso', 'Definir publicacao', 'Definir expiracao'],
  },
  {
    title: '4. Organizar documentos',
    description: 'Documentos sao separados por empresa, mantendo Macom Motors e Macom Mitsubishi em estruturas proprias.',
    visual: 'documents',
    items: ['Escolher empresa', 'Selecionar categoria', 'Enviar arquivo'],
  },
];

const rules = [
  'Usuarios comuns visualizam apenas modulos liberados.',
  'Apenas administradores acessam este guia e a tela de permissoes.',
  'Avisos expirados nao sao deletados; ficam ocultos para usuarios comuns.',
  'Avisos e eventos so podem ser alterados pelo criador ou por admin.',
  'Documentos devem ser cadastrados na empresa correta antes do envio.',
];

function VisualMockup({ type }) {
  const config = {
    access: {
      title: 'Acessos Sistemas',
      icon: KeyRound,
      accent: 'bg-emerald-500',
      rows: ['Kevin - Intranet - admin', 'Maria - Relatorios - gestor', 'Joao - Intranet - usuario'],
    },
    permissions: {
      title: 'Permissoes',
      icon: ShieldCheck,
      accent: 'bg-amber-500',
      rows: ['Avisos - editar', 'Documentos - ver', 'Feedback - sem'],
    },
    announcements: {
      title: 'Mural de Avisos',
      icon: Megaphone,
      accent: 'bg-red-500',
      rows: ['Publicado', 'Agendado', 'Expirado'],
    },
    documents: {
      title: 'Documentos',
      icon: FileText,
      accent: 'bg-blue-500',
      rows: ['macom_mitsubishi/rh', 'macom_motors/ti', 'macom_mitsubishi/financeiro'],
    },
  }[type];

  const Icon = config.icon;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" role="img" aria-label={`Guia visual ${config.title}`}>
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <span className={`h-3 w-3 rounded-full ${config.accent}`} />
        <span className="h-3 w-3 rounded-full bg-slate-300" />
        <span className="h-3 w-3 rounded-full bg-slate-300" />
        <span className="ml-auto text-[10px] font-bold uppercase text-muted-foreground">Fluxo</span>
      </div>
      <div className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{config.title}</p>
            <p className="text-xs text-muted-foreground">Exemplo administrativo</p>
          </div>
        </div>
        <div className="space-y-2">
          {config.rows.map((row) => (
            <div key={row} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
              <span className={`h-2.5 w-2.5 rounded-full ${config.accent}`} />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{row}</span>
              <span className="h-2 w-12 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PlatformGuide() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este guia e destinado apenas aos administradores da plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            Guia administrativo
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Guia Comercial e de Uso da Intranet</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Material interno para consulta dos administradores, com visao comercial, regras de uso e fluxos principais da plataforma.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <div key={module.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-foreground">{module.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.description}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Objetivo comercial</h2>
          </div>
          <div className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              A Intranet centraliza comunicacao interna, documentos, links de rotina e informacoes importantes para os colaboradores.
              O objetivo e reduzir ruído operacional e facilitar a consulta diaria.
            </p>
            <p>
              Para a administracao, o sistema oferece controle de permissoes, rastreabilidade de conteudos e separacao por modulos.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Niveis de acesso</h2>
          </div>
          <div className="space-y-3">
            {['Admin: controla tudo', 'Gestor: permissoes conforme liberacao', 'Usuario: consulta o que foi liberado'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Forma de uso</h2>
          <p className="mt-1 text-sm text-muted-foreground">Fluxos recomendados para administrar a Intranet com seguranca.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {guideSteps.map((section) => (
            <div key={section.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="grid gap-5 md:grid-cols-[0.95fr_1.05fr]">
                <VisualMockup type={section.visual} />
                <div>
                  <h3 className="text-base font-bold text-foreground">{section.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
                  <div className="mt-4 space-y-2">
                    {section.items.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-bold text-foreground">Regras importantes</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rules.map((rule) => (
            <div key={rule} className="flex items-start gap-3 rounded-xl border border-border px-3 py-3 text-sm leading-6 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
