import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Spinner } from '@macom/ui';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function buildInitialValue(fieldKey, record) {
  const value = record?.[fieldKey];
  return value === null || value === undefined ? '' : String(value);
}

export default function CollaboratorAssignmentDialogBase({
  collaborators,
  emptyLabel,
  fieldKey,
  label,
  loading,
  onOpenChange,
  onSubmit,
  open,
  record,
  searchToRevealOptions,
  title,
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(() => buildInitialValue(fieldKey, record));
  const inlinePicker = Boolean(searchToRevealOptions);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedId(buildInitialValue(fieldKey, record));
    }
  }, [fieldKey, open, record]);

  const selectedCollaborator = collaborators.find((collaborator) => collaborator.id === selectedId) || null;

  const filteredCollaborators = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return collaborators;
    }

    return collaborators.filter((collaborator) =>
      [collaborator.nome, collaborator.email, collaborator.cargo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [collaborators, search, searchToRevealOptions, selectedCollaborator]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({ [fieldKey]: selectedId || null });
  };

  const selectedLabel = selectedCollaborator?.nome || selectedCollaborator?.email || emptyLabel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] rounded-[12px] p-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>{label}</Label>
            <div className="rounded-lg border border-border bg-background p-2">
              <div className={`rounded-md border border-border/70 bg-muted/20 px-3 py-2 ${inlinePicker ? 'mb-2' : 'mb-0'}`}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Selecionado</p>
                <p className="truncate text-sm text-foreground">{selectedLabel}</p>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={`${fieldKey}-search`}
                  className="h-8 border-0 bg-muted/40 pl-9 shadow-none"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar colaborador"
                />
              </div>

              <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                <button
                  type="button"
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedId === ''
                      ? 'bg-primary/8 font-medium text-foreground'
                      : 'text-foreground hover:bg-muted/40'
                  }`}
                  onClick={() => {
                    setSelectedId('');
                  }}
                >
                  {emptyLabel}
                </button>

                {filteredCollaborators.length ? (
                  filteredCollaborators.map((collaborator) => (
                    <button
                      key={collaborator.id}
                      type="button"
                      className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                        selectedId === collaborator.id
                          ? 'bg-primary/8 text-foreground'
                          : 'hover:bg-muted/40'
                      }`}
                      onClick={() => {
                        setSelectedId(collaborator.id);
                      }}
                    >
                      <p className="truncate text-sm font-medium text-foreground">
                        {collaborator.nome || collaborator.email || collaborator.id}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {collaborator.email || collaborator.cargo || 'Sem detalhes'}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-md px-3 py-4 text-sm text-muted-foreground">
                    Nenhum colaborador encontrado.
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="justify-end gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-8 rounded-lg px-4 text-[13px]"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="h-8 rounded-lg px-4 text-[13px]">
              {loading ? <Spinner size="sm" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
