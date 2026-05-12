import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, Search } from 'lucide-react';

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(() => buildInitialValue(fieldKey, record));

  useEffect(() => {
    if (open) {
      setSearch('');
      setPickerOpen(false);
      setSelectedId(buildInitialValue(fieldKey, record));
    }
  }, [fieldKey, open, record]);

  const selectedCollaborator = collaborators.find((collaborator) => collaborator.id === selectedId) || null;

  const filteredCollaborators = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      if (!searchToRevealOptions) return collaborators;
      return selectedCollaborator ? [selectedCollaborator] : [];
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
            <div className="rounded-lg border border-border bg-background">
              <button
                type="button"
                className="flex h-10 w-full items-center justify-between px-3 text-left text-sm text-foreground"
                onClick={() => setPickerOpen((current) => !current)}
              >
                <span className="truncate">{selectedLabel}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {pickerOpen ? (
                <div className="border-t border-border p-2">
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

                  <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                    <button
                      type="button"
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        selectedId === ''
                          ? 'bg-primary/8 font-medium text-foreground'
                          : 'text-foreground hover:bg-muted/40'
                      }`}
                      onClick={() => {
                        setSelectedId('');
                        setPickerOpen(false);
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
                            setPickerOpen(false);
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
                        {searchToRevealOptions && !search.trim()
                          ? 'Digite para buscar colaboradores.'
                          : 'Nenhum colaborador encontrado.'}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
