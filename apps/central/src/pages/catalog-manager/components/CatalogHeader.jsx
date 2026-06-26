import { Download, ExternalLink, Plus, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';

const consoleBaseUrl = import.meta.env.VITE_CONSOLE_URL || 'http://localhost:5170';
const consoleUsersUrl = `${consoleBaseUrl.replace(/\/$/, '')}/usuarios`;

export default function CatalogHeader({
  canManage = true,
  importAssetsPending,
  importCollaboratorsPending,
  importContactsPending,
  importCorporateLinesPending,
  importInfrastructurePending,
  lockedEntityKey,
  onExportAssetsCsv,
  onExportCollaboratorsCsv,
  onImportAssets,
  onImportCollaborators,
  onImportContacts,
  onImportCorporateLines,
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
            {canManage ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 rounded-xl px-4 text-[14px]"
                onClick={onImportAssets}
                disabled={importAssetsPending}
              >
                <Upload className="h-4 w-4" /> Importar
              </Button>
            ) : null}
          </>
        ) : null}
        {lockedEntityKey === 'colaboradores' ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl px-4 text-[14px]"
              asChild
            >
              <a href={consoleUsersUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Acessos no Console
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl px-4 text-[14px]"
              onClick={onExportCollaboratorsCsv}
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            {canManage ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 rounded-xl px-4 text-[14px]"
                onClick={onImportCollaborators}
                disabled={importCollaboratorsPending}
              >
                <Upload className="h-4 w-4" /> Importar
              </Button>
            ) : null}
          </>
        ) : null}
        {canManage && lockedEntityKey === 'infra_estrutura' ? (
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
        {canManage && lockedEntityKey === 'contatos' ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-2 rounded-xl px-4 text-[14px]"
            onClick={onImportContacts}
            disabled={importContactsPending}
          >
            <Upload className="h-4 w-4" /> Importar
          </Button>
        ) : null}
        {canManage && lockedEntityKey === 'linhas_corporativas' ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-2 rounded-xl px-4 text-[14px]"
            onClick={onImportCorporateLines}
            disabled={importCorporateLinesPending}
          >
            <Upload className="h-4 w-4" /> Importar
          </Button>
        ) : null}
        {canManage ? (
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
        ) : null}
      </div>
    </div>
  );
}
