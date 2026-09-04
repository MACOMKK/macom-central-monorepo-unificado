import { FileCheck2, History, Laptop, User } from 'lucide-react';

import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@macom/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';

const SIGNED_FILE_BUCKET = 'central-anexos';

async function openTermFile(path) {
  const { data, error } = await supabase.storage.from(SIGNED_FILE_BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) return;
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

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

export default function AssetLinksDialog({
  asset,
  collaborator,
  onOpenChange,
  open,
  ownershipHistory = [],
  statusTone,
  terms,
  unitName,
}) {
  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhes do ativo</DialogTitle>
        </DialogHeader>

        <div className="mt-3 space-y-4">
          <section className="rounded-xl border border-border bg-muted/10 p-5">
            <div className="flex items-start gap-4 border-b border-border/70 pb-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Laptop className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold text-foreground">{asset.nome || 'Ativo sem nome'}</h3>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {[asset.marca, asset.modelo].filter(Boolean).join(' ') || 'Sem marca/modelo'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground">
                    {unitName || 'Sem unidade'}
                  </span>
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground">
                    {asset.categoria || 'Sem categoria'}
                  </span>
                  <Badge variant="outline" className={statusTone?.[asset.status] || statusTone?.inativo || ''}>
                    {asset.status === 'em_uso' ? 'Em uso' : asset.status || '-'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-x-6 gap-y-4 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Patrimonio</p>
                <p className="mt-1 text-sm font-medium text-foreground">{asset.patrimonio || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Numero de serie</p>
                <p className="mt-1 text-sm font-medium text-foreground">{asset.numero_serie || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Localizacao interna</p>
                <p className="mt-1 text-sm font-medium text-foreground">{asset.localizacao_interna || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Estado</p>
                <p className="mt-1 text-sm font-medium text-foreground">{asset.estado || '-'}</p>
              </div>
              {asset.observacao ? (
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Observacao</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{asset.observacao}</p>
                </div>
              ) : null}
            </div>
          </section>

          <Tabs defaultValue="responsavel" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="responsavel">Responsavel</TabsTrigger>
              <TabsTrigger value="termos">Termos ({terms.length})</TabsTrigger>
              <TabsTrigger value="historico">Historico ({ownershipHistory.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="responsavel">
              <section className="rounded-xl border border-border bg-muted/10 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                    <User className="h-4 w-4 text-slate-600" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Usuario vinculado</p>
                </div>

                {collaborator ? (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {getInitials(collaborator.nome)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{collaborator.nome || '-'}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{collaborator.cargo || 'Sem cargo'}</p>
                    </div>
                  </div>
                ) : (
                  <EmptyState label="Nenhum usuario vinculado a este ativo." />
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
                              <p className="truncate text-[11px] text-muted-foreground">{term.colaborador_nome || 'Sem colaborador'}</p>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Assinado: {formatTermDate(term.assinado_em)}
                              {term.devolvido_em ? ` · Devolvido: ${formatTermDate(term.devolvido_em)}` : ''}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-x-3">
                              {term.arquivo_path ? (
                                <button
                                  type="button"
                                  className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                                  onClick={() => openTermFile(term.arquivo_path)}
                                >
                                  Baixar termo assinado
                                </button>
                              ) : null}
                              {term.arquivo_devolucao_path ? (
                                <button
                                  type="button"
                                  className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                                  onClick={() => openTermFile(term.arquivo_devolucao_path)}
                                >
                                  Baixar comprovante de devolucao
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <Badge variant="outline" className={`shrink-0 ${statusTone?.[term.status] || statusTone?.inativo || ''}`}>
                            {termStatusLabels[term.status] || term.status || '-'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState label="Nenhum termo de posse gerado para este ativo." />
                )}
              </section>
            </TabsContent>

            <TabsContent value="historico">
              <section className="rounded-xl border border-border bg-muted/10 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                    <History className="h-4 w-4 text-amber-700" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Historico de posse</p>
                </div>

                {ownershipHistory.length ? (
                  <div className="mt-2 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {ownershipHistory.map((entry) => (
                      <div key={entry.id} className="pb-2 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 truncate text-sm text-foreground">
                            {entry.colaborador_anterior_nome || 'Sem usuario'}
                            {' → '}
                            {entry.colaborador_novo_nome || 'Sem usuario'}
                          </p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatTermDate(entry.alterado_em)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState label="Nenhuma troca de responsavel registrada para este ativo." />
                )}
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
