import React, { useMemo, useState } from 'react';
import { Settings as SettingsIcon, Shield } from 'lucide-react';

import { usePermissions } from '@/lib/usePermissions';
import { settingsSections } from './settingsSections';

function groupSections(sections) {
  return sections.reduce((groups, section) => {
    const group = section.group || 'Geral';
    return {
      ...groups,
      [group]: [...(groups[group] || []), section],
    };
  }, {});
}

export default function SettingsPage() {
  const { isLoading: permLoading, role } = usePermissions(null);
  const [activeSectionKey, setActiveSectionKey] = useState(settingsSections[0]?.key);
  const groupedSections = useMemo(() => groupSections(settingsSections), []);
  const activeSection = settingsSections.find((section) => section.key === activeSectionKey) || settingsSections[0];
  const ActiveSectionComponent = activeSection?.component;

  if (!permLoading && role !== 'admin') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-muted-foreground">
        <Shield className="mb-3 h-12 w-12 opacity-30" />
        <p>Apenas administradores podem acessar esta pagina.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Configuracoes</h1>
          <p className="text-sm text-muted-foreground">Configure recursos globais da intranet.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          {Object.entries(groupedSections).map(([group, sections]) => (
            <div key={group} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <p className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{group}</p>
              <div className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const active = section.key === activeSection.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => setActiveSectionKey(section.key)}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                        active
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-primary' : ''}`} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{section.label}</span>
                        <span className="mt-0.5 block text-xs leading-5">{section.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <section className="min-w-0 rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-5">
          {ActiveSectionComponent ? <ActiveSectionComponent /> : null}
        </section>
      </div>
    </div>
  );
}
