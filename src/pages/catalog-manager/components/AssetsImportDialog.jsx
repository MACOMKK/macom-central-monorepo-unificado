import { Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AssetsImportDialog({
  fileName,
  isPending,
  onClose,
  onConfirm,
  onDownloadCsvTemplate,
  onDownloadJsonTemplate,
  onFileChange,
  onOpenChange,
  open,
  preview,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">Importar Ativos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-1 font-semibold">Formatos aceitos</p>
            <p className="flex items-center gap-2 text-muted-foreground">CSV com cabecalho</p>
            <p className="flex items-center gap-2 text-muted-foreground">JSON (array de objetos)</p>
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-1 font-semibold">Campos esperados (exemplo)</p>
            <p className="break-all font-mono text-xs text-muted-foreground">
              nome,categoria,marca,modelo,numero_serie,patrimonio,unidade,localizacao_interna,observacao,estado,responsavel_email
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <button type="button" className="text-[#d1131f] hover:underline" onClick={onDownloadCsvTemplate}>
                Baixar modelo CSV
              </button>
              <button type="button" className="text-[#d1131f] hover:underline" onClick={onDownloadJsonTemplate}>
                Baixar modelo JSON
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="file"
              accept=".csv,text/csv,.json,application/json"
              className="w-full text-sm"
              onChange={onFileChange}
            />
            {fileName ? <p className="text-xs text-muted-foreground">{fileName}</p> : null}
          </div>

          {preview}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button type="button" className="gap-2" onClick={onConfirm} disabled={isPending}>
              <Upload className="h-4 w-4" /> {isPending ? 'Importando' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
