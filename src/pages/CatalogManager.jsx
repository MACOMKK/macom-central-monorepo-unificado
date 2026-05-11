import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, FileText, Globe, KeyRound, MapPinHouse, Monitor, Network, RefreshCw, Search, Trash2, Upload, UserPlus } from 'lucide-react';

import CatalogEntityDialog from '@/components/CatalogEntityDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FeedbackToast from '@/components/ui/feedback-toast';
import { Input } from '@/components/ui/input';
import AssetActionsMenu from '@/pages/catalog-manager/components/AssetActionsMenu';
import AssetAssignmentDialog from '@/pages/catalog-manager/components/AssetAssignmentDialog';
import AssetsToolbar from '@/pages/catalog-manager/components/AssetsToolbar';
import CatalogHeader from '@/pages/catalog-manager/components/CatalogHeader';
import CatalogImportDialogs from '@/pages/catalog-manager/components/CatalogImportDialogs';
import CatalogEntityTable from '@/pages/catalog-manager/components/CatalogEntityTable';
import CollaboratorActionsMenu from '@/pages/catalog-manager/components/CollaboratorActionsMenu';
import CollaboratorLinksDialog from '@/pages/catalog-manager/components/CollaboratorLinksDialog';
import CollaboratorsToolbar from '@/pages/catalog-manager/components/CollaboratorsToolbar';
import ContactActionsMenu from '@/pages/catalog-manager/components/ContactActionsMenu';
import CorporateLineActionsMenu from '@/pages/catalog-manager/components/CorporateLineActionsMenu';
import CorporateLineAssignmentDialog from '@/pages/catalog-manager/components/CorporateLineAssignmentDialog';
import DepartmentCardsGrid from '@/pages/catalog-manager/components/DepartmentCardsGrid';
import InfrastructureActionsMenu from '@/pages/catalog-manager/components/InfrastructureActionsMenu';
import PasswordResetDialog from '@/pages/catalog-manager/components/PasswordResetDialog';
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
import { useCatalogImportActions } from '@/pages/catalog-manager/hooks/useCatalogImportActions';
import { useCatalogMutations } from '@/pages/catalog-manager/hooks/useCatalogMutations';
import {
  countAssetsByDepartmentId,
  countAssetsByUnitId,
  countByKey,
  createAssetOptions,
  createCollaboratorOptions,
  createSelectOptions,
  indexById,
} from '@/pages/catalog-manager/utils/buildConfigLookups';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { catalogApi } from '@/lib/catalogApi';

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

function hasExactDigits(value, length) {
  return String(value || '').replace(/\D/g, '').length === length;
}

function generatePassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*';
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function levenshteinDistance(source, target) {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = source[row - 1] === target[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[source.length][target.length];
}

function resolveIdByName(rawValue, options) {
  const normalizedInput = normalizeText(rawValue);
  if (!normalizedInput) return null;

  const exactMatch = options.find((option) => option.normalized === normalizedInput);
  if (exactMatch) return exactMatch.id;

  let bestMatch = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const option of options) {
    const distance = levenshteinDistance(normalizedInput, option.normalized);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = option;
    }
  }

  const maxDistance = normalizedInput.length <= 6 ? 1 : 2;
  return bestDistance <= maxDistance ? bestMatch?.id || null : null;
}

export default function CatalogManager({ lockedEntityKey }) {
  const importInputRef = useRef(null);
  const isDepartmentsView = lockedEntityKey === 'departamentos';
  const isUnitsView = lockedEntityKey === 'unidades';
  const isCollaboratorsView = lockedEntityKey === 'colaboradores';
  const isTermsView = lockedEntityKey === 'termos_posse';
  const isAssetsView = lockedEntityKey === 'ativos';
  const isContactsView = lockedEntityKey === 'contatos';
  const isCorporateLinesView = lockedEntityKey === 'linhas_corporativas';
  const isInfrastructureView = lockedEntityKey === 'infra_estrutura';
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
  const [search, setSearch] = useState('');
  const [assetStatusFilter, setAssetStatusFilter] = useState('all');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('all');
  const [assetUnitFilter, setAssetUnitFilter] = useState('all');
  const [collaboratorUnitFilter, setCollaboratorUnitFilter] = useState('all');
  const [collaboratorDepartmentFilter, setCollaboratorDepartmentFilter] = useState('all');
  const [collaboratorStatusFilter, setCollaboratorStatusFilter] = useState('all');
  const [feedback, setFeedback] = useState(null);

  const { closeMenu, getMenu, runWithClosedMenu, toggleRowMenu } = useActionMenu();
  const assetMenu = getMenu('asset');
  const contactMenu = getMenu('contact');
  const corporateLineMenu = getMenu('corporateLine');
  const infrastructureMenu = getMenu('infrastructure');
  const collaboratorMenu = getMenu('collaborator');

  function showMenuError(message) {
    setFeedback({ type: 'error', message });
    closeMenu();
  }

  function openRecordEditor(menu) {
    setEditingRecord(menu.row);
    closeMenu();
  }

  function confirmMenuDeletion(rowId, message) {
    const confirmed = window.confirm(message);
    if (!confirmed) {
      closeMenu();
      return;
    }

    runWithClosedMenu(() => deleteMutation.mutate(rowId));
  }

  const departmentsQuery = useQuery({
    queryKey: ['departamentos'],
    queryFn: catalogApi.departamentos.list,
    enabled: !isAssetsView && !isContactsView && !isInfrastructureView && !isCorporateLinesView,
  });
  const unitsQuery = useQuery({ queryKey: ['unidades'], queryFn: catalogApi.unidades.list });
  const collaboratorsQuery = useQuery({
    queryKey: ['colaboradores'],
    queryFn: catalogApi.colaboradores.list,
    enabled: !isContactsView && !isInfrastructureView,
  });
  const contactsQuery = useQuery({
    queryKey: ['contatos'],
    queryFn: catalogApi.contatos.list,
    enabled: !isAssetsView && !isInfrastructureView && !isCorporateLinesView && !isDepartmentsView && !isUnitsView && !isCollaboratorsView && !isTermsView,
  });
  const corporateLinesQuery = useQuery({
    queryKey: ['linhas_corporativas'],
    queryFn: catalogApi.linhas_corporativas.list,
    enabled: !isAssetsView && !isContactsView && !isInfrastructureView && !isDepartmentsView && !isUnitsView && !isTermsView,
  });
  const assetsQuery = useQuery({
    queryKey: ['ativos'],
    queryFn: catalogApi.ativos.list,
    enabled: !isContactsView && !isInfrastructureView,
  });
  const infraQuery = useQuery({
    queryKey: ['infra_estrutura'],
    queryFn: catalogApi.infra_estrutura.list,
    enabled: !isAssetsView && !isContactsView && !isCorporateLinesView && !isDepartmentsView && !isUnitsView && !isCollaboratorsView && !isTermsView,
  });
  const termsQuery = useQuery({
    queryKey: ['termos_posse'],
    queryFn: catalogApi.termos_posse.list,
    enabled: !isAssetsView && !isContactsView && !isInfrastructureView && !isCorporateLinesView && !isDepartmentsView && !isUnitsView && !isCollaboratorsView,
  });

  const departments = departmentsQuery.data || [];
  const units = unitsQuery.data || [];
  const collaborators = collaboratorsQuery.data || [];
  const contacts = contactsQuery.data || [];
  const corporateLines = corporateLinesQuery.data || [];
  const assets = assetsQuery.data || [];
  const infraRows = infraQuery.data || [];
  const terms = termsQuery.data || [];

  function openMenuAssignment(setter, menu) {
    setter(menu.row);
    closeMenu();
  }

  function hasLinkedCollaboratorItems(collaboratorId) {
    return (
      assets.some((asset) => asset.usuario_id === collaboratorId) ||
      corporateLines.some((line) => line.colaborador_id === collaboratorId)
    );
  }

  const collaboratorCanUnlinkAll = Boolean(
    collaboratorMenu &&
      collaboratorMenu.row.status === 'inativo' &&
      hasLinkedCollaboratorItems(collaboratorMenu.row.id)
  );

  const assetMenuHandlers = {
    onAssign: () => openMenuAssignment(setAssigningAsset, assetMenu),
    onDelete: () => {
      if (assetMenu?.row?.usuario_id) {
        showMenuError('Nao e permitido excluir um ativo com usuario vinculado.');
        return;
      }

      confirmMenuDeletion(
        assetMenu.row.id,
        `Deseja realmente excluir ${assetMenu?.row?.nome || assetMenu?.row?.patrimonio || 'este ativo'}?`
      );
    },
    onEdit: () => openRecordEditor(assetMenu),
  };

  const contactMenuHandlers = {
    onDelete: () => {
      confirmMenuDeletion(
        contactMenu.row.id,
        `Deseja realmente excluir ${contactMenu?.row?.nome || 'este contato'}?`
      );
    },
    onEdit: () => openRecordEditor(contactMenu),
  };

  const corporateLineMenuHandlers = {
    onAssign: () => openMenuAssignment(setAssigningCorporateLine, corporateLineMenu),
    onDelete: () => {
      if (corporateLineMenu?.row?.colaborador_id) {
        showMenuError('Nao e permitido excluir uma linha corporativa com colaborador vinculado.');
        return;
      }

      confirmMenuDeletion(
        corporateLineMenu.row.id,
        `Deseja realmente excluir ${corporateLineMenu?.row?.nome || corporateLineMenu?.row?.numero || 'esta linha corporativa'}?`
      );
    },
    onEdit: () => openRecordEditor(corporateLineMenu),
  };

  const infrastructureMenuHandlers = {
    onDelete: () => {
      confirmMenuDeletion(
        infrastructureMenu.row.id,
        `Deseja realmente excluir ${infrastructureMenu?.row?.nome || 'este registro de infraestrutura'}?`
      );
    },
    onEdit: () => openRecordEditor(infrastructureMenu),
  };

  const collaboratorMenuHandlers = {
    onDelete: () => {
      if (hasLinkedCollaboratorItems(collaboratorMenu?.row?.id)) {
        showMenuError('Nao e permitido excluir um colaborador com itens vinculados.');
        return;
      }

      confirmMenuDeletion(
        collaboratorMenu.row.id,
        `Deseja realmente excluir o usuario ${collaboratorMenu?.row?.nome || collaboratorMenu?.row?.email || ''}?`
      );
    },
    onEdit: () => openRecordEditor(collaboratorMenu),
    onResetPassword: () => {
      setPasswordRecord(collaboratorMenu.row);
      closeMenu();
    },
    onUnlinkAll: () => {
      const confirmed = window.confirm(
        `Deseja realmente desvincular todos os ativos e linhas corporativas de ${collaboratorMenu?.row?.nome || 'este colaborador'}?`
      );
      if (confirmed) {
        unlinkAssignmentsMutation.mutate(collaboratorMenu.row.id);
      }
      closeMenu();
    },
  };

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

  const config = useMemo(() => {
    const departmentOptions = createSelectOptions(departments);
    const unitOptions = createSelectOptions(units);
    const collaboratorOptions = createCollaboratorOptions(collaborators);
    const assetOptions = createAssetOptions(assets);
    const assetsByProfileId = countByKey(assets, 'usuario_id');
    const linesByProfileId = countByKey(corporateLines, 'colaborador_id');
    const collaboratorsByDepartmentId = countByKey(collaborators, 'departamento_id');
    const collaboratorsById = indexById(collaborators);
    const assetsByDepartmentId = countAssetsByDepartmentId(assets, collaboratorsById);
    const collaboratorsByUnitId = countByKey(collaborators, 'unidade_id');
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
        collaboratorOptions,
        Badge,
      }),
      ativos: buildAssetsConfig({
        assetCategoryOptions,
        assetConditionOptions,
        assets,
        collaborators,
        collaboratorOptions,
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
  }, [assets, collaborators, contacts, corporateLines, departments, editingRecord?.id, infraRows, terms, units]);

  const current = config[lockedEntityKey];
  const rows = current.rows.filter((row) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      Object.values(row).some((value) => String(value || '').toLowerCase().includes(query)) ||
      collaborators
        .find((item) => item.id === row.usuario_id)
        ?.nome?.toLowerCase()
        .includes(query);

    if (lockedEntityKey !== 'ativos') {
      if (lockedEntityKey !== 'colaboradores') {
        return matchesSearch;
      }

      const matchesUnit = collaboratorUnitFilter === 'all' || row.unidade_id === collaboratorUnitFilter;
      const matchesDepartment = collaboratorDepartmentFilter === 'all' || row.departamento_id === collaboratorDepartmentFilter;
      const matchesStatus = collaboratorStatusFilter === 'all' || row.status === collaboratorStatusFilter;

      return matchesSearch && matchesUnit && matchesDepartment && matchesStatus;
    }

    const matchesStatus = assetStatusFilter === 'all' || row.status === assetStatusFilter;
    const matchesCategory = assetCategoryFilter === 'all' || row.categoria === assetCategoryFilter;
    const matchesUnit = assetUnitFilter === 'all' || row.unidade_id === assetUnitFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesUnit;
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

  const resetImportInfrastructureDialog = () => {
    setImportInfrastructureOpen(false);
    setImportInfrastructureFile(null);
    setImportInfrastructurePreview([]);
  };

  const {
    assignCorporateLineMutation,
    assignUserMutation,
    deleteMutation,
    importAssetsMutation,
    importCollaboratorsMutation,
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
    onResetInfrastructureImport: resetImportInfrastructureDialog,
    onSaveSuccess: () => setEditingRecord(null),
    resolveIdByName,
    setFeedback,
    units,
  });

  const {
    handleConfirmImportAssets,
    handleConfirmImportCollaborators,
    handleConfirmImportInfrastructure,
    handleDownloadAssetsJsonTemplate,
    handleDownloadAssetsTemplate,
    handleDownloadCollaboratorsJsonTemplate,
    handleDownloadCollaboratorsTemplate,
    handleDownloadInfrastructureJsonTemplate,
    handleDownloadInfrastructureTemplate,
    handleExportAssetsCsv,
    handleExportCollaboratorsCsv,
    handleImportAssetsClick,
    handleImportAssetsFile,
    handleImportCollaboratorsFile,
    handleImportInfrastructureFile,
    openAssetsImportDialog,
    openCollaboratorsImportDialog,
    openInfrastructureImportDialog,
  } = useCatalogImportActions({
    assets,
    collaborators,
    departments,
    importAssetsMutation,
    importAssetsPreview,
    importCollaboratorsFile,
    importCollaboratorsMutation,
    importCollaboratorsPreview,
    importFile,
    importInfrastructureFile,
    importInfrastructureMutation,
    importInfrastructurePreview,
    importInputRef,
    setFeedback,
    setImportAssetsOpen,
    setImportAssetsPreview,
    setImportCollaboratorsFile,
    setImportCollaboratorsOpen,
    setImportCollaboratorsPreview,
    setImportFile,
    setImportInfrastructureFile,
    setImportInfrastructureOpen,
    setImportInfrastructurePreview,
    units,
  });

  const handleGeneratePassword = async () => {
    const nextPassword = generatePassword();
    setPasswordForm({ password: nextPassword, confirmPassword: nextPassword });
    try {
      await navigator.clipboard.writeText(nextPassword);
      setFeedback({ type: 'success', message: 'Senha gerada e copiada.' });
    } catch {
      setFeedback({ type: 'success', message: 'Senha gerada com sucesso.' });
    }
  };

  const handleCopyPassword = async () => {
    if (!passwordForm.password) return;
    try {
      await navigator.clipboard.writeText(passwordForm.password);
      setFeedback({ type: 'success', message: 'Senha copiada.' });
    } catch {
      setFeedback({ type: 'error', message: 'Nao foi possivel copiar a senha.' });
    }
  };

  const handleSubmitPassword = () => {
    if (!passwordRecord?.id) return;
    if (!passwordForm.password || passwordForm.password.length < 6) {
      setFeedback({ type: 'error', message: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setFeedback({ type: 'error', message: 'As senhas nao conferem.' });
      return;
    }
    passwordMutation.mutate({ id: passwordRecord.id, password: passwordForm.password });
  };

  const isLoading =
    lockedEntityKey === 'departamentos'
      ? departmentsQuery.isLoading || assetsQuery.isLoading || collaboratorsQuery.isLoading
      : lockedEntityKey === 'unidades'
        ? unitsQuery.isLoading || assetsQuery.isLoading || collaboratorsQuery.isLoading
        : lockedEntityKey === 'colaboradores'
          ? collaboratorsQuery.isLoading || assetsQuery.isLoading || corporateLinesQuery.isLoading || departmentsQuery.isLoading || unitsQuery.isLoading
          : lockedEntityKey === 'contatos'
            ? contactsQuery.isLoading || unitsQuery.isLoading
            : lockedEntityKey === 'linhas_corporativas'
              ? corporateLinesQuery.isLoading || collaboratorsQuery.isLoading || unitsQuery.isLoading
          : lockedEntityKey === 'infra_estrutura'
            ? infraQuery.isLoading || unitsQuery.isLoading
          : lockedEntityKey === 'termos_posse'
            ? termsQuery.isLoading || assetsQuery.isLoading || collaboratorsQuery.isLoading
            : assetsQuery.isLoading || collaboratorsQuery.isLoading || unitsQuery.isLoading;

  return (
    <div className="space-y-6">
      <CatalogHeader
        importAssetsPending={importAssetsMutation.isPending}
        importCollaboratorsPending={importCollaboratorsMutation.isPending}
        importInfrastructurePending={importInfrastructureMutation.isPending}
        lockedEntityKey={lockedEntityKey}
        onExportAssetsCsv={handleExportAssetsCsv}
        onExportCollaboratorsCsv={handleExportCollaboratorsCsv}
        onImportAssets={openAssetsImportDialog}
        onImportCollaborators={openCollaboratorsImportDialog}
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
            onDelete={(departmentId) => deleteMutation.mutate(departmentId)}
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
            onDelete={(unitId) => deleteMutation.mutate(unitId)}
            onEdit={setEditingRecord}
            units={rows}
          />
        )
      ) : (
        <CatalogEntityTable
          columns={current.columns}
          entityKey={lockedEntityKey}
          isLoading={isLoading}
          onDelete={(rowId) => deleteMutation.mutate(rowId)}
          onEdit={setEditingRecord}
          onRowClick={setViewingCollaboratorLinks}
          rows={rows}
          toggleRowMenu={toggleRowMenu}
        />
      )}

      {editingRecord !== null ? (
        <CatalogEntityDialog
          open={editingRecord !== null}
          onOpenChange={(open) => {
            if (!open) setEditingRecord(null);
          }}
          title={
            lockedEntityKey === 'unidades'
              ? `${editingRecord?.id ? 'Editar' : 'Nova'} Unidade`
              : lockedEntityKey === 'contatos'
                ? editingRecord?.id
                  ? 'Editar Fornecedor'
                  : 'Novo Fornecedor'
              : lockedEntityKey === 'infra_estrutura'
                ? editingRecord?.id
                  ? 'Editar Registro'
                  : 'Novo Registro'
              : lockedEntityKey === 'termos_posse'
                ? editingRecord?.id
                  ? 'Editar Termo de Posse'
                  : 'Gerar Termo de Posse'
                : `${editingRecord?.id ? 'Editar' : 'Novo'} ${entityMeta[lockedEntityKey].singular}`
          }
          description={
            lockedEntityKey === 'colaboradores'
              ? ''
              : lockedEntityKey === 'ativos'
                ? ''
                : lockedEntityKey === 'contatos'
                  ? ''
                  : lockedEntityKey === 'linhas_corporativas'
                    ? ''
                : lockedEntityKey === 'infra_estrutura'
                  ? ''
                : lockedEntityKey === 'termos_posse'
                  ? ''
                : 'Edite apenas os campos que existem hoje no banco.'
          }
          record={editingRecord?.id ? editingRecord : null}
          fields={current.fields}
          loading={saveMutation.isPending}
          hideDescription={lockedEntityKey === 'unidades' || lockedEntityKey === 'termos_posse' || lockedEntityKey === 'infra_estrutura' || lockedEntityKey === 'contatos' || lockedEntityKey === 'linhas_corporativas'}
          dialogClassName={
            lockedEntityKey === 'unidades'
              ? 'max-w-[520px] rounded-[16px] border bg-background p-6 text-foreground shadow-[0_30px_80px_rgba(0,0,0,0.18)]'
              : lockedEntityKey === 'contatos'
                ? 'w-full max-w-lg max-h-[90vh] overflow-y-auto border bg-background p-6 shadow-lg sm:rounded-lg'
              : lockedEntityKey === 'linhas_corporativas'
                ? 'w-full max-w-lg max-h-[90vh] overflow-y-auto border bg-background p-6 shadow-lg sm:rounded-lg'
              : lockedEntityKey === 'infra_estrutura'
                ? 'w-full max-w-lg max-h-[90vh] overflow-y-auto border bg-background p-6 shadow-lg sm:rounded-lg'
                : lockedEntityKey === 'ativos'
                  ? 'max-w-[460px] rounded-[12px] p-3.5'
                : lockedEntityKey === 'termos_posse'
                  ? 'max-w-[760px] rounded-[14px] p-4'
                : undefined
          }
          formClassName={
            lockedEntityKey === 'unidades'
              ? 'grid gap-5 sm:grid-cols-2'
              : lockedEntityKey === 'contatos'
                ? 'mt-2 grid gap-4 sm:grid-cols-2'
              : lockedEntityKey === 'linhas_corporativas'
                ? 'mt-2 grid gap-4 sm:grid-cols-2'
              : lockedEntityKey === 'infra_estrutura'
                ? 'mt-2 space-y-4'
              : lockedEntityKey === 'ativos'
                ? 'grid gap-2.5 sm:grid-cols-2'
                : lockedEntityKey === 'termos_posse'
                  ? 'grid gap-3 sm:grid-cols-2'
                : undefined
          }
          footerClassName={lockedEntityKey === 'unidades' || lockedEntityKey === 'infra_estrutura' || lockedEntityKey === 'contatos' ? 'justify-end gap-3 pt-2 sm:space-x-0' : undefined}
          cancelLabel={lockedEntityKey === 'unidades' || lockedEntityKey === 'infra_estrutura' || lockedEntityKey === 'contatos' ? 'Cancelar' : undefined}
          submitLabel={
            lockedEntityKey === 'unidades'
              ? editingRecord?.id
                ? 'Salvar'
                : 'Cadastrar'
              : lockedEntityKey === 'contatos'
                ? editingRecord?.id
                  ? 'Salvar'
                  : 'Cadastrar'
              : lockedEntityKey === 'infra_estrutura'
                ? editingRecord?.id
                  ? 'Salvar'
                  : 'Cadastrar'
              : undefined
          }
          cancelButtonClassName={lockedEntityKey === 'unidades' || lockedEntityKey === 'infra_estrutura' || lockedEntityKey === 'contatos' ? 'h-9 rounded-md px-4 py-2 text-sm font-medium' : undefined}
          submitButtonClassName={
            lockedEntityKey === 'unidades'
              ? 'h-10 rounded-lg bg-[#d1131f] px-6 text-[15px] text-white hover:bg-[#b50f1a]'
              : lockedEntityKey === 'contatos'
                ? 'h-9 gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
              : lockedEntityKey === 'infra_estrutura'
                ? 'h-9 gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
              : lockedEntityKey === 'ativos'
                ? 'h-8 rounded-lg px-4 text-[13px]'
                : lockedEntityKey === 'termos_posse'
                  ? 'h-9 rounded-lg px-4 text-[13px]'
                : undefined
          }
          onSubmit={(payload) => saveMutation.mutateAsync({ record: editingRecord?.id ? editingRecord : null, payload })}
        />
      ) : null}

      <AssetAssignmentDialog
        collaborators={collaborators}
        loading={assignUserMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setAssigningAsset(null);
        }}
        onSubmit={(payload) => assignUserMutation.mutateAsync({ id: assigningAsset.id, payload })}
        open={assigningAsset !== null}
        record={assigningAsset}
      />

      <CorporateLineAssignmentDialog
        collaborators={collaborators}
        loading={assignCorporateLineMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setAssigningCorporateLine(null);
        }}
        onSubmit={(payload) =>
          assignCorporateLineMutation.mutateAsync({
            id: assigningCorporateLine.id,
            payload: {
              ...payload,
              status: payload.colaborador_id ? 'em_uso' : 'disponivel',
            },
          })
        }
        open={assigningCorporateLine !== null}
        record={assigningCorporateLine}
      />

      <CollaboratorLinksDialog
        assets={viewingCollaboratorLinks ? linkedAssetsByCollaboratorId[viewingCollaboratorLinks.id] || [] : []}
        collaborator={viewingCollaboratorLinks}
        departmentName={
          viewingCollaboratorLinks
            ? departments.find((item) => item.id === viewingCollaboratorLinks.departamento_id)?.nome || 'Sem departamento'
            : 'Sem departamento'
        }
        formatDate={formatDate}
        formatPhone={formatPhone}
        lines={viewingCollaboratorLinks ? linkedLinesByCollaboratorId[viewingCollaboratorLinks.id] || [] : []}
        onOpenChange={(open) => {
          if (!open) setViewingCollaboratorLinks(null);
        }}
        open={viewingCollaboratorLinks !== null}
        unitName={
          viewingCollaboratorLinks
            ? units.find((item) => item.id === viewingCollaboratorLinks.unidade_id)?.nome || 'Sem unidade'
            : 'Sem unidade'
        }
      />

      <AssetActionsMenu
        menu={assetMenu}
        onAssign={assetMenuHandlers.onAssign}
        onDelete={assetMenuHandlers.onDelete}
        onEdit={assetMenuHandlers.onEdit}
      />

      <ContactActionsMenu
        menu={contactMenu}
        onDelete={contactMenuHandlers.onDelete}
        onEdit={contactMenuHandlers.onEdit}
      />

      <CorporateLineActionsMenu
        menu={corporateLineMenu}
        onAssign={corporateLineMenuHandlers.onAssign}
        onDelete={corporateLineMenuHandlers.onDelete}
        onEdit={corporateLineMenuHandlers.onEdit}
      />

      <InfrastructureActionsMenu
        menu={infrastructureMenu}
        onDelete={infrastructureMenuHandlers.onDelete}
        onEdit={infrastructureMenuHandlers.onEdit}
      />

      <CollaboratorActionsMenu
        canUnlinkAll={collaboratorCanUnlinkAll}
        isUnlinking={unlinkAssignmentsMutation.isPending}
        menu={collaboratorMenu}
        onDelete={collaboratorMenuHandlers.onDelete}
        onEdit={collaboratorMenuHandlers.onEdit}
        onResetPassword={collaboratorMenuHandlers.onResetPassword}
        onUnlinkAll={collaboratorMenuHandlers.onUnlinkAll}
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

      <PasswordResetDialog
        form={passwordForm}
        isPending={passwordMutation.isPending}
        onClose={() => {
          setPasswordRecord(null);
          setPasswordForm({ password: '', confirmPassword: '' });
        }}
        onConfirmPasswordChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
        onCopyPassword={handleCopyPassword}
        onGeneratePassword={handleGeneratePassword}
        onPasswordChange={(value) => setPasswordForm((current) => ({ ...current, password: value }))}
        onSubmit={handleSubmitPassword}
        open={passwordRecord !== null}
      />

      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}







