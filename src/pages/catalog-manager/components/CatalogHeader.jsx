import { Download, Plus, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function CatalogHeader({
  importAssetsPending,
  importCollaboratorsPending,
  importInfrastructurePending,
  lockedEntityKey,
  onExportAssetsCsv,
  onExportCollaboratorsCsv,
  onImportAssets,
  onImportCollaborators,
  onImportInfrastructure,
  onNewRecord,
  singularLabel,
  subtitle,
  title,
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        {lockedEntityKey !== 'unidades' && lockedEntityKey !== 'departamentos' && subtitle ? (
          <p className="mt-1 text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {lockedEntityKey === 'ativos' ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl px-4 text-[14px]"
              onClick={onExportAssetsCsv}
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl px-4 text-[14px]"
              onClick={onImportAssets}
              disabled={importAssetsPending}
            >
              <Upload className="h-4 w-4" /> Importar
            </Button>
          </>
        ) : null}
        {lockedEntityKey === 'colaboradores' ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl px-4 text-[14px]"
              onClick={onExportCollaboratorsCsv}
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl px-4 text-[14px]"
              onClick={onImportCollaborators}
              disabled={importCollaboratorsPending}
            >
              <Upload className="h-4 w-4" /> Importar
            </Button>
          </>
        ) : null}
        {lockedEntityKey === 'infra_estrutura' ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-2 rounded-xl px-4 text-[14px]"
            onClick={onImportInfrastructure}
            disabled={importInfrastructurePending}
          >
            <Upload className="h-4 w-4" /> Importar
          </Button>
        ) : null}
        <Button
          onClick={onNewRecord}
          className={`h-10 gap-2 rounded-xl px-4 ${
            lockedEntityKey === 'unidades' ||
            lockedEntityKey === 'departamentos' ||
            lockedEntityKey === 'ativos' ||
            lockedEntityKey === 'termos_posse' ||
            lockedEntityKey === 'infra_estrutura'
              ? 'bg-[#d1131f] hover:bg-[#b50f1a]'
              : ''
          }`}
        >
          <Plus className="h-4 w-4" />{' '}
          {lockedEntityKey === 'termos_posse'
            ? 'Gerar Termo'
            : lockedEntityKey === 'infra_estrutura'
              ? 'Novo'
              : `Novo ${singularLabel}`}
        </Button>
      </div>
    </div>
  );
}
