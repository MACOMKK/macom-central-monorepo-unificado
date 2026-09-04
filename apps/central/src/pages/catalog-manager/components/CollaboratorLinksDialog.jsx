import { FileCheck2, KeyRound, Laptop, Phone } from 'lucide-react';

import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@macom/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const termStatusLabels = {
  gerado: 'Gerado',
  assinado: 'Assinado',
  cancelado: 'Cancelado',
  devolvido: 'Devolvido',
};

function formatTermDate(dateString) {
  if (!dateString) return '-';
  const datePart = String(dateString).slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

function EmptyState({ label }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/10 px-3 py-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export default function CollaboratorLinksDialog({
  assets,
  collaborator,
  departmentName,
  formatDate,
  formatPhone,
  lines,
  onOpenChange,
  open,
  statusTone,
  systems,
  terms,
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

        <div className="mt-3 space-y-4">
          <section className="rounded-xl border border-border bg-muted/10 p-5">
            <div className="flex items-start gap-4 border-b border-border/70 pb-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {getInitials(collaborator.nome)}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold text-foreground">{collaborator.nome || '-'}</h3>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {collaborator.cargo || 'Sem cargo'} - {departmentName || 'Sem departamento'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
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

          <Tabs defaultValue="ativos" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="ativos">Ativos ({assets.length})</TabsTrigger>
              <TabsTrigger value="linhas">Linhas ({lines.length})</TabsTrigger>
              <TabsTrigger value="sistemas">Sistemas ({systems.length})</TabsTrigger>
              <TabsTrigger value="termos">Termos ({terms.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="ativos">
              <section className="rounded-xl border border-border bg-muted/10 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                    <Laptop className="h-4 w-4 text-slate-600" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Ativos em posse</p>
                </div>

                {assets.length ? (
                  <div className="mt-2 max-h-[320px] space-y-2 overflow-y-auto pr-1">
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
                  <EmptyState label="Nenhum ativo em posse." />
                )}
              </section>
            </TabsContent>

            <TabsContent value="linhas">
              <section className="rounded-xl border border-border bg-muted/10 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Linhas corporativas</p>
                </div>

                {lines.length ? (
                  <div className="mt-2 max-h-[320px] space-y-2 overflow-y-auto pr-1">
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
                  <EmptyState label="Nenhuma linha corporativa vinculada." />
                )}
              </section>
            </TabsContent>

            <TabsContent value="sistemas">
              <section className="rounded-xl border border-border bg-muted/10 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                    <KeyRound className="h-4 w-4 text-emerald-700" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Sistemas vinculados</p>
                </div>

                {systems.length ? (
                  <div className="mt-2 max-h-[320px] space-y-2 overflow-y-auto pr-1">
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
                  <EmptyState label="Nenhum sistema vinculado." />
                )}
              </section>
            </TabsContent>

            <TabsContent value="termos">
              <section className="rounded-xl border border-border bg-muted/10 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
                    <FileCheck2 className="h-4 w-4 text-violet-700" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Termos de posse</p>
                </div>

                {terms.length ? (
                  <div className="mt-2 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {terms.map((term) => (
                      <div key={term.id} className="pb-2 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <p className="truncate font-medium text-foreground">{term.codigo || 'Termo sem codigo'}</p>
                              <span className="shrink-0 text-muted-foreground">-</span>
                              <p className="truncate text-[11px] text-muted-foreground">{term.ativo_nome || 'Sem equipamento'}</p>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Assinado: {formatTermDate(term.assinado_em)}
                              {term.devolvido_em ? ` · Devolvido: ${formatTermDate(term.devolvido_em)}` : ''}
                            </p>
                          </div>
                          <Badge variant="outline" className={`shrink-0 ${statusTone?.[term.status] || statusTone?.inativo || ''}`}>
                            {termStatusLabels[term.status] || term.status || '-'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState label="Nenhum termo de posse gerado." />
                )}
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
