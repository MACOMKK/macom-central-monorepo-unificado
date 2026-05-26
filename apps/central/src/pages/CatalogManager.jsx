import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Globe, Monitor, Network, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FeedbackToast from '@/components/ui/feedback-toast';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import CatalogAuxDialogs from '@/pages/catalog-manager/components/CatalogAuxDialogs';
import CatalogActionMenus from '@/pages/catalog-manager/components/CatalogActionMenus';
import AssetsToolbar from '@/pages/catalog-manager/components/AssetsToolbar';
import CatalogHeader from '@/pages/catalog-manager/components/CatalogHeader';
import CatalogImportDialogs from '@/pages/catalog-manager/components/CatalogImportDialogs';
import CatalogRecordDialog from '@/pages/catalog-manager/components/CatalogRecordDialog';
import CatalogEntityTable from '@/pages/catalog-manager/components/CatalogEntityTable';
import CollaboratorsToolbar from '@/pages/catalog-manager/components/CollaboratorsToolbar';
import DepartmentCardsGrid from '@/pages/catalog-manager/components/DepartmentCardsGrid';
import SearchToolbar from '@/pages/catalog-manager/components/SearchToolbar';
import UnitCardsGrid from '@/pages/catalog-manager/components/UnitCardsGrid';
import { entityMeta } from '@/pages/catalog-manager/config/entityMeta';
import { buildAssetsConfig, buildCollaboratorsConfig, buildContactsConfig, buildCorporateLinesConfig, buildDepartmentsConfig, buildInfrastructureConfig, buildTermsConfig, buildUnitsConfig } from '@/pages/catalog-manager/config/simpleEntityConfigs.jsx';
import {
  assetCategoryOptions,
  assetConditionOptions,
  collaboratorRoleOptions,
  collaboratorStatusOptions,
  contactTypeOptions,
  corporateLineStatusOptions,
  corporateLineTypeOptions,
  infrastructureTypeOptions,
  termStatusOptions,
  unitStatusOptions,
} from '@/pages/catalog-manager/config/staticOptions';
import { contactTypeTone, statusTone } from '@/pages/catalog-manager/config/uiMaps';
import { useActionMenu } from '@/pages/catalog-manager/hooks/useActionMenu';
import { useCatalogActionHandlers } from '@/pages/catalog-manager/hooks/useCatalogActionHandlers';
import { useCatalogImportActions } from '@/pages/catalog-manager/hooks/useCatalogImportActions';
import { useCatalogMutations } from '@/pages/catalog-manager/hooks/useCatalogMutations';
import { useCatalogPasswordActions } from '@/pages/catalog-manager/hooks/useCatalogPasswordActions';
import { useCatalogViewState } from '@/pages/catalog-manager/hooks/useCatalogViewState';
import { hasExactDigits, normalizeText, resolveIdByName } from '@macom/validation';
import {
  countAssetsByDepartmentId,
  countAssetsByUnitId,
  countByKey,
  createAssetOptions,
  createCollaboratorOptions,
  createSelectOptions,
  indexById,
} from '@/pages/catalog-manager/utils/buildConfigLookups';
import { catalogApi } from '@/lib/catalogApi';
import { systemAccessApi } from '@/lib/systemAccessApi';

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime()) ? dateString : date.toLocaleDateString('pt-BR');
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? dateString : date.toLocaleString('pt-BR');
}

function formatPhone(phone) {
  if (!phone) return '-';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

function generatePassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*';
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

const ENTITY_DEPENDENCIES = {
  ativos: ['ativos', 'colaboradores', 'unidades'],
  colaboradores: ['colaboradores', 'ativos', 'linhas_corporativas', 'departamentos', 'unidades', 'sistemas', 'acessos_usuario_sistema'],
  contatos: ['contatos', 'unidades'],
  departamentos: ['departamentos', 'ativos', 'colaboradores'],
  infra_estrutura: ['infra_estrutura', 'unidades'],
  linhas_corporativas: ['linhas_corporativas', 'colaboradores', 'unidades'],
  termos_posse: ['termos_posse', 'ativos', 'colaboradores'],
  unidades: ['unidades', 'ativos', 'colaboradores'],
};

export default function CatalogManager({ lockedEntityKey }) {
  const importInputRef = useRef(null);
  const isCollaboratorsView = lockedEntityKey === 'colaboradores';
  const isAssetsView = lockedEntityKey === 'ativos';
  const isCorporateLinesView = lockedEntityKey === 'linhas_corporativas';
  const isBulkDeleteView =
    lockedEntityKey === 'ativos' ||
    lockedEntityKey === 'colaboradores' ||
    lockedEntityKey === 'infra_estrutura' ||
    lockedEntityKey === 'linhas_corporativas' ||
    lockedEntityKey === 'contatos';
  const [editingRecord, setEditingRecord] = useState(null);
  const [assigningAsset, setAssigningAsset] = useState(null);
  const [assigningCorporateLine, setAssigningCorporateLine] = useState(null);
  const [viewingCollaboratorLinks, setViewingCollaboratorLinks] = useState(null);
  const [passwordRecord, setPasswordRecord] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [importAssetsOpen, setImportAssetsOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importAssetsPreview, setImportAssetsPreview] = useState([]);
  const [importInfrastructureOpen, setImportInfrastructureOpen] = useState(false);
  const [importInfrastructureFile, setImportInfrastructureFile] = useState(null);
  const [importInfrastructurePreview, setImportInfrastructurePreview] = useState([]);
  const [importCollaboratorsOpen, setImportCollaboratorsOpen] = useState(false);
  const [importCollaboratorsFile, setImportCollaboratorsFile] = useState(null);
  const [importCollaboratorsPreview, setImportCollaboratorsPreview] = useState([]);
  const [importContactsOpen, setImportContactsOpen] = useState(false);
  const [importContactsFile, setImportContactsFile] = useState(null);
  const [importContactsPreview, setImportContactsPreview] = useState([]);
  const [importCorporateLinesOpen, setImportCorporateLinesOpen] = useState(false);
  const [importCorporateLinesFile, setImportCorporateLinesFile] = useState(null);
  const [importCorporateLinesPreview, setImportCorporateLinesPreview] = useState([]);
  const [search, setSearch] = useState('');
  const [assetStatusFilter, setAssetStatusFilter] = useState('all');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('all');
  const [assetUnitFilter, setAssetUnitFilter] = useState('all');
  const [collaboratorUnitFilter, setCollaboratorUnitFilter] = useState('all');
  const [collaboratorDepartmentFilter, setCollaboratorDepartmentFilter] = useState('all');
  const [collaboratorStatusFilter, setCollaboratorStatusFilter] = useState('all');
  const [selectedBulkIds, setSelectedBulkIds] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const { closeMenu, getMenu, runWithClosedMenu, toggleRowMenu } = useActionMenu();
  const assetMenu = getMenu('asset');
  const contactMenu = getMenu('contact');
  const corporateLineMenu = getMenu('corporateLine');
  const infrastructureMenu = getMenu('infrastructure');
  const collaboratorMenu = getMenu('collaborator');
  const requiredEntities = ENTITY_DEPENDENCIES[lockedEntityKey] || [];
  const requiresEntity = (entityKey) => requiredEntities.includes(entityKey);

  const departmentsQuery = useQuery({
    queryKey: ['departamentos'],
    queryFn: catalogApi.departamentos.list,
    enabled: requiresEntity('departamentos'),
  });
  const unitsQuery = useQuery({
    queryKey: ['unidades'],
    queryFn: catalogApi.unidades.list,
    enabled: requiresEntity('unidades'),
  });
  const collaboratorsQuery = useQuery({
    queryKey: ['colaboradores'],
    queryFn: catalogApi.colaboradores.list,
    enabled: requiresEntity('colaboradores'),
  });
  const contactsQuery = useQuery({
    queryKey: ['contatos'],
    queryFn: catalogApi.contatos.list,
    enabled: requiresEntity('contatos'),
  });
  const corporateLinesQuery = useQuery({
    queryKey: ['linhas_corporativas'],
    queryFn: catalogApi.linhas_corporativas.list,
    enabled: requiresEntity('linhas_corporativas'),
  });
  const assetsQuery = useQuery({
    queryKey: ['ativos'],
    queryFn: catalogApi.ativos.list,
    enabled: requiresEntity('ativos'),
  });
  const infraQuery = useQuery({
    queryKey: ['infra_estrutura'],
    queryFn: catalogApi.infra_estrutura.list,
    enabled: requiresEntity('infra_estrutura'),
  });
  const termsQuery = useQuery({
    queryKey: ['termos_posse'],
    queryFn: catalogApi.termos_posse.list,
    enabled: requiresEntity('termos_posse'),
  });
  const systemsQuery = useQuery({
    queryKey: ['sistemas'],
    queryFn: systemAccessApi.systems.list,
    enabled: requiresEntity('sistemas'),
  });
  const systemAccessesQuery = useQuery({
    queryKey: ['acessos_usuario_sistema'],
    queryFn: systemAccessApi.accesses.list,
    enabled: requiresEntity('acessos_usuario_sistema'),
  });

  const departments = departmentsQuery.data || [];
  const units = unitsQuery.data || [];
  const collaborators = collaboratorsQuery.data || [];
  const activeCollaborators = collaborators.filter((collaborator) => collaborator.status !== 'inativo');
  const contacts = contactsQuery.data || [];
  const corporateLines = corporateLinesQuery.data || [];
  const assets = assetsQuery.data || [];
  const infraRows = infraQuery.data || [];
  const terms = termsQuery.data || [];
  const systems = systemsQuery.data || [];
  const systemAccesses = systemAccessesQuery.data || [];

  const linkedAssetsByCollaboratorId = useMemo(
    () =>
      assets.reduce((acc, asset) => {
        if (asset.usuario_id) {
          if (!acc[asset.usuario_id]) acc[asset.usuario_id] = [];
          acc[asset.usuario_id].push(asset);
        }
        return acc;
      }, {}),
    [assets]
  );

  const linkedLinesByCollaboratorId = useMemo(
    () =>
      corporateLines.reduce((acc, line) => {
        if (line.colaborador_id) {
          if (!acc[line.colaborador_id]) acc[line.colaborador_id] = [];
          acc[line.colaborador_id].push(line);
        }
        return acc;
      }, {}),
    [corporateLines]
  );

  const linkedSystemsByCollaboratorId = useMemo(() => {
    const systemsById = systems.reduce((acc, system) => {
      acc[system.id] = system;
      return acc;
    }, {});

    return systemAccesses.reduce((acc, access) => {
      if (!access.colaborador_id) {
        return acc;
      }

      if (!acc[access.colaborador_id]) {
        acc[access.colaborador_id] = [];
      }

      const linkedSystem = access.sistema_id ? systemsById[access.sistema_id] : null;
      acc[access.colaborador_id].push({
        ...access,
        sistema_nome: linkedSystem?.nome || 'Sistema sem nome',
        sistema_slug: linkedSystem?.slug || null,
      });
      return acc;
    }, {});
  }, [systemAccesses, systems]);

  const config = useMemo(() => {
    const departmentOptions = createSelectOptions(departments);
    const unitOptions = createSelectOptions(units);
    const collaboratorOptions = createCollaboratorOptions(collaborators);
    const activeCollaboratorOptions = createCollaboratorOptions(activeCollaborators);
    const assetOptions = createAssetOptions(assets);
    const assetsByProfileId = countByKey(assets, 'usuario_id');
    const linesByProfileId = countByKey(corporateLines, 'colaborador_id');
    const systemsByProfileId = countByKey(systemAccesses, 'colaborador_id');
    const collaboratorsByDepartmentId = countByKey(activeCollaborators, 'departamento_id');
    const collaboratorsById = indexById(collaborators);
    const assetsByDepartmentId = countAssetsByDepartmentId(assets, collaboratorsById);
    const collaboratorsByUnitId = countByKey(activeCollaborators, 'unidade_id');
    const assetsByUnitId = countAssetsByUnitId(assets);

    return {
      departamentos: buildDepartmentsConfig({
        assetsByDepartmentId,
        collaboratorsByDepartmentId,
        departments,
        formatDateTime,
      }),
      unidades: buildUnitsConfig({
        assetsByUnitId,
        collaboratorsByUnitId,
        formatDateTime,
        formatPhone,
        statusTone,
        unitStatusOptions,
        units,
        Badge,
      }),
      colaboradores: buildCollaboratorsConfig({
        assetsByProfileId,
        Badge,
        collaboratorRoleOptions,
        collaboratorStatusOptions,
        collaborators,
        departments,
        departmentOptions,
        editingRecord,
        formatPhone,
        hasExactDigits,
        linesByProfileId,
        Monitor,
        onViewLinks: setViewingCollaboratorLinks,
        systemsByProfileId,
        statusTone,
        unitOptions,
        units,
      }),
      contatos: buildContactsConfig({
        contacts,
        contactTypeOptions,
        contactTypeTone,
        formatPhone,
        unitOptions,
        units,
        Badge,
      }),
      linhas_corporativas: buildCorporateLinesConfig({
        collaborators,
        corporateLineStatusOptions,
        corporateLineTypeOptions,
        corporateLines,
        hasExactDigits,
        statusTone,
        unitOptions,
        units,
        collaboratorOptions: activeCollaboratorOptions,
        Badge,
      }),
      ativos: buildAssetsConfig({
        assetCategoryOptions,
        assetConditionOptions,
        assets,
        collaborators,
        collaboratorOptions: activeCollaboratorOptions,
        statusTone,
        unitOptions,
        units,
        Badge,
      }),
      infra_estrutura: buildInfrastructureConfig({
        formatDateTime,
        infrastructureTypeOptions,
        infraRows,
        unitOptions,
        units,
        Badge,
        Globe,
        Network,
      }),
      termos_posse: buildTermsConfig({
        assetOptions,
        Badge,
        collaboratorOptions,
        editingRecord,
        formatDateTime,
        statusTone,
        termStatusOptions,
        terms,
      }),
    };
  }, [activeCollaborators, assets, collaborators, contacts, corporateLines, departments, editingRecord?.id, infraRows, systemAccesses, terms, units]);

  const queryStatesByEntity = {
    acessos_usuario_sistema: systemAccessesQuery,
    ativos: assetsQuery,
    colaboradores: collaboratorsQuery,
    contatos: contactsQuery,
    departamentos: departmentsQuery,
    infra_estrutura: infraQuery,
    linhas_corporativas: corporateLinesQuery,
    sistemas: systemsQuery,
    termos_posse: termsQuery,
    unidades: unitsQuery,
  };

  const loadingByEntity = {
    [lockedEntityKey]: requiredEntities.some((entityKey) => queryStatesByEntity[entityKey]?.isLoading),
  };

  const { current, isLoading, rows } = useCatalogViewState({
    assetCategoryFilter,
    assetStatusFilter,
    assetUnitFilter,
    collaborators,
    collaboratorDepartmentFilter,
    collaboratorStatusFilter,
    collaboratorUnitFilter,
    config,
    loadingByEntity,
    lockedEntityKey,
    search,
  });

  const resetImportAssetsDialog = () => {
    setImportAssetsOpen(false);
    setImportFile(null);
    setImportAssetsPreview([]);
  };

  const resetImportCollaboratorsDialog = () => {
    setImportCollaboratorsOpen(false);
    setImportCollaboratorsFile(null);
    setImportCollaboratorsPreview([]);
  };

  const resetImportContactsDialog = () => {
    setImportContactsOpen(false);
    setImportContactsFile(null);
    setImportContactsPreview([]);
  };

  const resetImportCorporateLinesDialog = () => {
    setImportCorporateLinesOpen(false);
    setImportCorporateLinesFile(null);
    setImportCorporateLinesPreview([]);
  };

  const resetImportInfrastructureDialog = () => {
    setImportInfrastructureOpen(false);
    setImportInfrastructureFile(null);
    setImportInfrastructurePreview([]);
  };

  const handleDeleteDepartment = (departmentId) => {
    const hasLinkedCollaborators = collaborators.some((collaborator) => collaborator.departamento_id === departmentId);

    if (hasLinkedCollaborators) {
      setFeedback({ type: 'error', message: 'Nao e permitido excluir um departamento com colaboradores vinculados.' });
      return;
    }

    setConfirmDialog({
      title: 'Excluir departamento',
      description: 'Essa acao nao pode ser desfeita. Deseja realmente excluir este departamento?',
      onConfirm: () => deleteMutation.mutate(departmentId),
    });
  };

  const handleDeleteUnit = (unitId) => {
    const hasLinkedCollaborators = collaborators.some((collaborator) => collaborator.unidade_id === unitId);

    if (hasLinkedCollaborators) {
      setFeedback({ type: 'error', message: 'Nao e permitido excluir uma unidade com colaboradores vinculados.' });
      return;
    }

    setConfirmDialog({
      title: 'Excluir unidade',
      description: 'Essa acao nao pode ser desfeita. Deseja realmente excluir esta unidade?',
      onConfirm: () => deleteMutation.mutate(unitId),
    });
  };

  const {
    assignCorporateLineMutation,
    assignUserMutation,
    deleteManyMutation,
    deleteMutation,
    importAssetsMutation,
    importCollaboratorsMutation,
    importContactsMutation,
    importCorporateLinesMutation,
    importInfrastructureMutation,
    passwordMutation,
    saveMutation,
    unlinkAssignmentsMutation,
  } = useCatalogMutations({
    collaborators,
    currentQueryKey: current.queryKey,
    departments,
    lockedEntityKey,
    normalizeText,
    onAssignAssetSuccess: () => setAssigningAsset(null),
    onAssignCorporateLineSuccess: () => setAssigningCorporateLine(null),
    onPasswordSuccess: () => {
      setPasswordRecord(null);
      setPasswordForm({ password: '', confirmPassword: '' });
    },
    onResetAssetsImport: resetImportAssetsDialog,
    onResetCollaboratorsImport: resetImportCollaboratorsDialog,
    onResetContactsImport: resetImportContactsDialog,
    onResetCorporateLinesImport: resetImportCorporateLinesDialog,
    onResetInfrastructureImport: resetImportInfrastructureDialog,
    onSaveSuccess: () => setEditingRecord(null),
    resolveIdByName,
    setFeedback,
    units,
  });

  useEffect(() => {
    if (!isBulkDeleteView) {
      setSelectedBulkIds((currentSelection) => (currentSelection.length ? [] : currentSelection));
      return;
    }

    const availableIds = new Set(rows.map((row) => row.id));
    setSelectedBulkIds((currentSelection) => {
      const nextSelection = currentSelection.filter((selectedId) => availableIds.has(selectedId));
      return nextSelection.length === currentSelection.length ? currentSelection : nextSelection;
    });
  }, [isBulkDeleteView, rows]);

  const {
    assetMenuHandlers,
    collaboratorCanUnlinkAll,
    collaboratorMenuHandlers,
    contactMenuHandlers,
    corporateLineMenuHandlers,
    infrastructureMenuHandlers,
  } = useCatalogActionHandlers({
    assetMenu,
    assets,
    closeMenu,
    collaboratorMenu,
    corporateLineMenu,
    corporateLines,
    contactMenu,
    deleteRecord: (rowId) => deleteMutation.mutate(rowId),
    infrastructureMenu,
    openAssetAssignment: setAssigningAsset,
    openCorporateLineAssignment: setAssigningCorporateLine,
    openPasswordReset: setPasswordRecord,
    openRecord: setEditingRecord,
    requestConfirmation: setConfirmDialog,
    systemAccesses,
    runWithClosedMenu,
    setFeedback,
    unlinkAssignments: (collaboratorId) => unlinkAssignmentsMutation.mutate(collaboratorId),
  });

  const {
    handleConfirmImportAssets,
    handleConfirmImportCollaborators,
    handleConfirmImportContacts,
    handleConfirmImportCorporateLines,
    handleConfirmImportInfrastructure,
    handleDownloadAssetsJsonTemplate,
    handleDownloadAssetsTemplate,
    handleDownloadCollaboratorsJsonTemplate,
    handleDownloadCollaboratorsTemplate,
    handleDownloadContactsJsonTemplate,
    handleDownloadContactsTemplate,
    handleDownloadCorporateLinesJsonTemplate,
    handleDownloadCorporateLinesTemplate,
    handleDownloadInfrastructureJsonTemplate,
    handleDownloadInfrastructureTemplate,
    handleExportAssetsCsv,
    handleExportCollaboratorsCsv,
    handleImportAssetsFile,
    handleImportCollaboratorsFile,
    handleImportContactsFile,
    handleImportCorporateLinesFile,
    handleImportInfrastructureFile,
    openAssetsImportDialog,
    openCollaboratorsImportDialog,
    openContactsImportDialog,
    openCorporateLinesImportDialog,
    openInfrastructureImportDialog,
  } = useCatalogImportActions({
    assets,
    collaborators,
    departments,
    importAssetsMutation,
    importAssetsPreview,
    importContactsFile,
    importContactsMutation,
    importContactsPreview,
    importCollaboratorsFile,
    importCollaboratorsMutation,
    importCollaboratorsPreview,
    importCorporateLinesFile,
    importCorporateLinesMutation,
    importCorporateLinesPreview,
    importFile,
    importInfrastructureFile,
    importInfrastructureMutation,
    importInfrastructurePreview,
    setFeedback,
    setImportAssetsOpen,
    setImportAssetsPreview,
    setImportCollaboratorsFile,
    setImportCollaboratorsOpen,
    setImportCollaboratorsPreview,
    setImportContactsFile,
    setImportContactsOpen,
    setImportContactsPreview,
    setImportCorporateLinesFile,
    setImportCorporateLinesOpen,
    setImportCorporateLinesPreview,
    setImportFile,
    setImportInfrastructureFile,
    setImportInfrastructureOpen,
    setImportInfrastructurePreview,
    units,
  });

  const { handleCopyPassword, handleGeneratePassword, handleSubmitPassword } = useCatalogPasswordActions({
    generatePassword,
    mutatePassword: (payload) => passwordMutation.mutate(payload),
    navigatorClipboard: navigator.clipboard,
    passwordForm,
    passwordRecord,
    setFeedback,
    setPasswordForm,
  });

  const allBulkRowsSelected =
    isBulkDeleteView &&
    rows.length > 0 &&
    rows.every((row) => selectedBulkIds.includes(row.id));

  const handleToggleBulkSelection = (rowId, checked) => {
    setSelectedBulkIds((currentSelection) =>
      checked
        ? [...currentSelection, rowId]
        : currentSelection.filter((selectedId) => selectedId !== rowId)
    );
  };

  const handleToggleAllBulkRows = (checked) => {
    setSelectedBulkIds(checked ? rows.map((row) => row.id) : []);
  };

  const handleDeleteSelectedRows = async () => {
    if (!selectedBulkIds.length) return;

    if (isAssetsView) {
      const hasLinkedUsers = rows.some(
        (row) => selectedBulkIds.includes(row.id) && row.usuario_id
      );

      if (hasLinkedUsers) {
        setFeedback({
          type: 'error',
          message: 'Nao e permitido excluir ativos com usuario vinculado.',
        });
        return;
      }
    }

    if (isCollaboratorsView) {
      const hasLinkedItems = rows.some((row) => {
        if (!selectedBulkIds.includes(row.id)) return false;
        const assetsCount = linkedAssetsByCollaboratorId[row.id]?.length || 0;
        const linesCount = linkedLinesByCollaboratorId[row.id]?.length || 0;
        const systemsCount = linkedSystemsByCollaboratorId[row.id]?.length || 0;
        return assetsCount + linesCount + systemsCount > 0;
      });

      if (hasLinkedItems) {
        setFeedback({
          type: 'error',
          message: 'Nao e permitido excluir colaboradores com itens vinculados.',
        });
        return;
      }
    }

    if (isCorporateLinesView) {
      const hasLinkedCollaborators = rows.some(
        (row) => selectedBulkIds.includes(row.id) && row.colaborador_id
      );

      if (hasLinkedCollaborators) {
        setFeedback({
          type: 'error',
          message: 'Nao e permitido excluir linhas corporativas com colaborador vinculado.',
        });
        return;
      }
    }

    const selectionLabel =
      lockedEntityKey === 'ativos'
        ? 'ativo(s)'
        : lockedEntityKey === 'colaboradores'
          ? 'colaborador(es)'
        : lockedEntityKey === 'contatos'
          ? 'contato(s)'
        : lockedEntityKey === 'linhas_corporativas'
            ? 'linha(s) corporativa(s)'
            : 'registro(s) de infraestrutura';

    setConfirmDialog({
      title: 'Excluir itens selecionados',
      description: `Essa acao nao pode ser desfeita. Deseja realmente excluir ${selectedBulkIds.length} ${selectionLabel} selecionado(s)?`,
      onConfirm: async () => {
        const result = await deleteManyMutation.mutateAsync(selectedBulkIds);
        if (result?.removedIds?.length) {
          setSelectedBulkIds((currentSelection) =>
            currentSelection.filter((selectedId) => !result.removedIds.includes(selectedId))
          );
        }
      },
    });
  };

  const handleDeleteRow = (row) => {
    const rowLabel = row?.nome || row?.titulo || row?.numero || row?.email || row?.id || 'este registro';
    setConfirmDialog({
      title: 'Excluir registro',
      description: `Essa acao nao pode ser desfeita. Deseja realmente excluir ${rowLabel}?`,
      onConfirm: () => deleteMutation.mutate(row.id),
    });
  };

  const handleConfirmDialog = async () => {
    if (!confirmDialog?.onConfirm) return;
    await confirmDialog.onConfirm();
    setConfirmDialog(null);
  };

  return (
    <div className="space-y-6">
      <CatalogHeader
        importAssetsPending={importAssetsMutation.isPending}
        importCollaboratorsPending={importCollaboratorsMutation.isPending}
        importContactsPending={importContactsMutation.isPending}
        importCorporateLinesPending={importCorporateLinesMutation.isPending}
        importInfrastructurePending={importInfrastructureMutation.isPending}
        lockedEntityKey={lockedEntityKey}
        onExportAssetsCsv={handleExportAssetsCsv}
        onExportCollaboratorsCsv={handleExportCollaboratorsCsv}
        onImportAssets={openAssetsImportDialog}
        onImportCollaborators={openCollaboratorsImportDialog}
        onImportContacts={openContactsImportDialog}
        onImportCorporateLines={openCorporateLinesImportDialog}
        onImportInfrastructure={openInfrastructureImportDialog}
        onNewRecord={() => setEditingRecord({})}
        singularLabel={entityMeta[lockedEntityKey].singular}
        subtitle={entityMeta[lockedEntityKey].subtitle}
        title={entityMeta[lockedEntityKey].title}
      />

      {lockedEntityKey === 'unidades' || lockedEntityKey === 'departamentos' ? null : lockedEntityKey === 'ativos' ? (
        <AssetsToolbar
          assetCategoryFilter={assetCategoryFilter}
          assetStatusFilter={assetStatusFilter}
          assetUnitFilter={assetUnitFilter}
          categoryOptions={[...new Set(assets.map((item) => item.categoria).filter(Boolean))]}
          importInputRef={importInputRef}
          onAssetCategoryFilterChange={setAssetCategoryFilter}
          onAssetStatusFilterChange={setAssetStatusFilter}
          onAssetUnitFilterChange={setAssetUnitFilter}
          onImportAssetsFile={handleImportAssetsFile}
          onSearchChange={setSearch}
          search={search}
          searchPlaceholder={current.searchPlaceholder}
          units={units}
        />
      ) : lockedEntityKey === 'colaboradores' ? (
        <CollaboratorsToolbar
          collaboratorDepartmentFilter={collaboratorDepartmentFilter}
          collaboratorStatusFilter={collaboratorStatusFilter}
          collaboratorUnitFilter={collaboratorUnitFilter}
          departments={departments}
          onCollaboratorDepartmentFilterChange={setCollaboratorDepartmentFilter}
          onCollaboratorStatusFilterChange={setCollaboratorStatusFilter}
          onCollaboratorUnitFilterChange={setCollaboratorUnitFilter}
          onSearchChange={setSearch}
          search={search}
          units={units}
        />
      ) : (
        <SearchToolbar onSearchChange={setSearch} placeholder={current.searchPlaceholder} search={search} />
      )}

      {isBulkDeleteView && selectedBulkIds.length > 0 ? (
        <Card className="flex flex-col gap-3 border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {selectedBulkIds.length} item(ns) selecionado(s)
            </p>
            <p className="text-sm text-muted-foreground">Use a exclusao em lote para remover varios itens de uma vez.</p>
          </div>
          <Button
            className="sm:self-auto"
            disabled={deleteManyMutation.isPending}
            onClick={handleDeleteSelectedRows}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4" />
            Excluir selecionados
          </Button>
        </Card>
      ) : null}

      {lockedEntityKey === 'departamentos' ? (
        isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
                <Building2 className="h-12 w-12 text-muted-foreground/70" />
              </div>
              <p className="text-base font-medium text-foreground">Nenhum departamento encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">Cadastre o primeiro departamento para comecar.</p>
            </div>
          </Card>
        ) : (
          <DepartmentCardsGrid
            assetsByDepartmentId={current.cardStats?.assetsByDepartmentId}
            collaboratorsByDepartmentId={current.cardStats?.collaboratorsByDepartmentId}
            departments={rows}
            onDelete={handleDeleteDepartment}
            onEdit={setEditingRecord}
          />
        )
      ) : lockedEntityKey === 'unidades' ? (
        isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
                <Building2 className="h-12 w-12 text-muted-foreground/70" />
              </div>
              <p className="text-base font-medium text-foreground">Nenhuma unidade encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">Cadastre a primeira unidade para comecar.</p>
            </div>
          </Card>
        ) : (
          <UnitCardsGrid
            assetsByUnitId={current.cardStats?.assetsByUnitId}
            collaboratorsByUnitId={current.cardStats?.collaboratorsByUnitId}
            formatPhone={formatPhone}
            onDelete={handleDeleteUnit}
            onEdit={setEditingRecord}
            units={rows}
          />
        )
      ) : (
        <CatalogEntityTable
          allRowsSelected={allBulkRowsSelected}
          columns={current.columns}
          entityKey={lockedEntityKey}
          isLoading={isLoading}
          onDelete={handleDeleteRow}
          onEdit={setEditingRecord}
          onRowClick={setViewingCollaboratorLinks}
          onToggleAllRows={handleToggleAllBulkRows}
          onToggleRowSelection={handleToggleBulkSelection}
          rows={rows}
          selectedRowIds={selectedBulkIds}
          toggleRowMenu={toggleRowMenu}
        />
      )}

      {editingRecord !== null ? (
        <CatalogRecordDialog
          editingRecord={editingRecord}
          fields={current.fields}
          isPending={saveMutation.isPending}
          lockedEntityKey={lockedEntityKey}
          onOpenChange={(open) => {
            if (!open) setEditingRecord(null);
          }}
          onSubmit={(payload) => saveMutation.mutateAsync({ record: editingRecord?.id ? editingRecord : null, payload })}
          singularLabel={entityMeta[lockedEntityKey].singular}
        />
      ) : null}

      <CatalogAuxDialogs
        assetAssignment={{
          collaborators: activeCollaborators,
          loading: assignUserMutation.isPending,
          onOpenChange: (open) => {
            if (!open) setAssigningAsset(null);
          },
          onSubmit: (payload) => assignUserMutation.mutateAsync({ id: assigningAsset.id, payload }),
          open: assigningAsset !== null,
          record: assigningAsset,
        }}
        collaboratorLinks={{
          assets: viewingCollaboratorLinks ? linkedAssetsByCollaboratorId[viewingCollaboratorLinks.id] || [] : [],
          collaborator: viewingCollaboratorLinks,
          departmentName: viewingCollaboratorLinks
            ? departments.find((item) => item.id === viewingCollaboratorLinks.departamento_id)?.nome || 'Sem departamento'
            : 'Sem departamento',
          formatDate,
          formatPhone,
          lines: viewingCollaboratorLinks ? linkedLinesByCollaboratorId[viewingCollaboratorLinks.id] || [] : [],
          onOpenChange: (open) => {
            if (!open) setViewingCollaboratorLinks(null);
          },
          open: viewingCollaboratorLinks !== null,
          systems: viewingCollaboratorLinks ? linkedSystemsByCollaboratorId[viewingCollaboratorLinks.id] || [] : [],
          unitName: viewingCollaboratorLinks
            ? units.find((item) => item.id === viewingCollaboratorLinks.unidade_id)?.nome || 'Sem unidade'
            : 'Sem unidade',
        }}
        corporateLineAssignment={{
          collaborators: activeCollaborators,
          loading: assignCorporateLineMutation.isPending,
          onOpenChange: (open) => {
            if (!open) setAssigningCorporateLine(null);
          },
          onSubmit: (payload) =>
            assignCorporateLineMutation.mutateAsync({
              id: assigningCorporateLine.id,
              payload: {
                ...payload,
                status: payload.colaborador_id ? 'em_uso' : 'disponivel',
              },
            }),
          open: assigningCorporateLine !== null,
          record: assigningCorporateLine,
        }}
        passwordReset={{
          form: passwordForm,
          isPending: passwordMutation.isPending,
          onClose: () => {
            setPasswordRecord(null);
            setPasswordForm({ password: '', confirmPassword: '' });
          },
          onConfirmPasswordChange: (value) => setPasswordForm((current) => ({ ...current, confirmPassword: value })),
          onCopyPassword: handleCopyPassword,
          onGeneratePassword: handleGeneratePassword,
          onPasswordChange: (value) => setPasswordForm((current) => ({ ...current, password: value })),
          onSubmit: handleSubmitPassword,
          open: passwordRecord !== null,
        }}
      />

      <CatalogActionMenus
        assetMenu={assetMenu}
        assetMenuHandlers={assetMenuHandlers}
        collaboratorCanUnlinkAll={collaboratorCanUnlinkAll}
        collaboratorMenu={collaboratorMenu}
        collaboratorMenuHandlers={collaboratorMenuHandlers}
        contactMenu={contactMenu}
        contactMenuHandlers={contactMenuHandlers}
        corporateLineMenu={corporateLineMenu}
        corporateLineMenuHandlers={corporateLineMenuHandlers}
        infrastructureMenu={infrastructureMenu}
        infrastructureMenuHandlers={infrastructureMenuHandlers}
        isUnlinking={unlinkAssignmentsMutation.isPending}
      />

      <CatalogImportDialogs
        assetsImport={{
          fileName: importFile?.name,
          isPending: importAssetsMutation.isPending,
          onClose: resetImportAssetsDialog,
          onConfirm: handleConfirmImportAssets,
          onDownloadCsvTemplate: handleDownloadAssetsTemplate,
          onDownloadJsonTemplate: handleDownloadAssetsJsonTemplate,
          onFileChange: handleImportAssetsFile,
          onOpenChange: (open) => {
            setImportAssetsOpen(open);
            if (!open) {
              resetImportAssetsDialog();
            }
          },
          open: importAssetsOpen,
          previewRows: importAssetsPreview,
        }}
        collaboratorsImport={{
          fileName: importCollaboratorsFile?.name,
          isPending: importCollaboratorsMutation.isPending,
          onClose: resetImportCollaboratorsDialog,
          onConfirm: handleConfirmImportCollaborators,
          onDownloadCsvTemplate: handleDownloadCollaboratorsTemplate,
          onDownloadJsonTemplate: handleDownloadCollaboratorsJsonTemplate,
          onFileChange: handleImportCollaboratorsFile,
          onOpenChange: (open) => {
            setImportCollaboratorsOpen(open);
            if (!open) {
              resetImportCollaboratorsDialog();
            }
          },
          open: importCollaboratorsOpen,
          previewRows: importCollaboratorsPreview,
        }}
        contactsImport={{
          fileName: importContactsFile?.name,
          isPending: importContactsMutation.isPending,
          onClose: resetImportContactsDialog,
          onConfirm: handleConfirmImportContacts,
          onDownloadCsvTemplate: handleDownloadContactsTemplate,
          onDownloadJsonTemplate: handleDownloadContactsJsonTemplate,
          onFileChange: handleImportContactsFile,
          onOpenChange: (open) => {
            setImportContactsOpen(open);
            if (!open) {
              resetImportContactsDialog();
            }
          },
          open: importContactsOpen,
          previewRows: importContactsPreview,
        }}
        corporateLinesImport={{
          fileName: importCorporateLinesFile?.name,
          isPending: importCorporateLinesMutation.isPending,
          onClose: resetImportCorporateLinesDialog,
          onConfirm: handleConfirmImportCorporateLines,
          onDownloadCsvTemplate: handleDownloadCorporateLinesTemplate,
          onDownloadJsonTemplate: handleDownloadCorporateLinesJsonTemplate,
          onFileChange: handleImportCorporateLinesFile,
          onOpenChange: (open) => {
            setImportCorporateLinesOpen(open);
            if (!open) {
              resetImportCorporateLinesDialog();
            }
          },
          open: importCorporateLinesOpen,
          previewRows: importCorporateLinesPreview,
        }}
        infrastructureImport={{
          fileName: importInfrastructureFile?.name,
          isPending: importInfrastructureMutation.isPending,
          onClose: resetImportInfrastructureDialog,
          onConfirm: handleConfirmImportInfrastructure,
          onDownloadCsvTemplate: handleDownloadInfrastructureTemplate,
          onDownloadJsonTemplate: handleDownloadInfrastructureJsonTemplate,
          onFileChange: handleImportInfrastructureFile,
          onOpenChange: (open) => {
            setImportInfrastructureOpen(open);
            if (!open) {
              resetImportInfrastructureDialog();
            }
          },
          open: importInfrastructureOpen,
          previewRows: importInfrastructurePreview,
        }}
      />

      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />

      <ConfirmDeleteDialog
        open={Boolean(confirmDialog)}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        onConfirm={handleConfirmDialog}
        title={confirmDialog?.title || 'Confirmar exclusao'}
        description={confirmDialog?.description || 'Essa acao nao pode ser desfeita.'}
        confirmLabel={confirmDialog?.confirmLabel || 'Excluir'}
      />
    </div>
  );
}
