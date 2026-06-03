import { KeyRound, Laptop, Phone } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function CollaboratorLinksDialog({
  assets,
  collaborator,
  departmentName,
  formatDate,
  formatPhone,
  lines,
  onOpenChange,
  open,
  systems,
  unitName,
}) {
  if (!collaborator) return null;
  const roleLabels = {
    admin: 'Admin',
    gestor: 'Gestor',
    usuario: 'Usuario',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhes do colaborador</DialogTitle>
        </DialogHeader>

        <div className="mt-3 space-y-5">
          <section className="rounded-xl border border-border bg-muted/10 p-5">
            <div className="border-b border-border/70 pb-4">
              <h3 className="text-lg font-bold text-foreground">{collaborator.nome || '-'}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {collaborator.cargo || 'Sem cargo'} - {departmentName || 'Sem departamento'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground">
                  {unitName || 'Sem unidade'}
                </span>
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground">
                  {roleLabels[collaborator.funcao] || collaborator.funcao || 'Usuario'}
                </span>
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground">
                  {collaborator.status || '-'}
                </span>
              </div>
            </div>

            <div className="grid gap-x-6 gap-y-4 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="mt-1 text-sm font-medium text-foreground">{collaborator.email || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Telefone</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatPhone(collaborator.telefone)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">CPF</p>
                <p className="mt-1 text-sm font-medium text-foreground">{collaborator.cpf || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Admissao</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatDate(collaborator.data_admissao)}</p>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  <Laptop className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Ativos em posse ({assets.length})</p>
                </div>
              </div>
              <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground">
                {assets.length}
              </span>
            </div>

            {assets.length ? (
              <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {assets.map((asset) => (
                  <div key={asset.id} className="pb-2 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2 text-sm">
                        <p className="truncate text-foreground">{asset.nome || 'Ativo sem nome'}</p>
                        <span className="shrink-0 text-muted-foreground">-</span>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {[asset.patrimonio, asset.numero_serie].filter(Boolean).join(' / ') || 'sem-identificacao'}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{asset.categoria || 'Ativo'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
                Nenhum ativo em posse.
              </div>
            )}
          </section>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Phone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Linhas corporativas ({lines.length})</p>
                </div>
              </div>
              <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                {lines.length}
              </span>
            </div>

            {lines.length ? (
              <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {lines.map((line) => (
                  <div key={line.id} className="pb-2 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2 text-sm">
                        <p className="truncate text-foreground">{line.numero || 'Linha sem identificacao'}</p>
                        <span className="shrink-0 text-muted-foreground">-</span>
                        <p className="truncate text-[11px] text-muted-foreground">{line.operadora || '-'}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-blue-700">{line.tipo || 'Linha'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
                Nenhuma linha corporativa vinculada.
              </div>
            )}
          </section>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <KeyRound className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Sistemas vinculados ({systems.length})</p>
                </div>
              </div>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                {systems.length}
              </span>
            </div>

            {systems.length ? (
              <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {systems.map((systemAccess) => (
                  <div key={systemAccess.id} className="pb-2 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2 text-sm">
                        <p className="truncate text-foreground">{systemAccess.sistema_nome || 'Sistema sem nome'}</p>
                        <span className="shrink-0 text-muted-foreground">-</span>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {systemAccess.sistema_slug || 'sem-slug'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] font-medium text-emerald-700">
                          {systemAccess.nivel_acesso || 'usuario'}
                        </span>
                        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                          {systemAccess.ativo ? 'ativo' : 'inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
                Nenhum sistema vinculado.
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
