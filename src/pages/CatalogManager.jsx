import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, FileText, Globe, KeyRound, MapPin, MapPinHouse, Monitor, Network, Pencil, Phone, RefreshCw, Search, Trash2, Upload, UserPlus, UserRound } from 'lucide-react';

import CatalogEntityDialog from '@/components/CatalogEntityDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FeedbackToast from '@/components/ui/feedback-toast';
import { Input } from '@/components/ui/input';
import AssetActionsMenu from '@/pages/catalog-manager/components/AssetActionsMenu';
import AssetAssignmentDialog from '@/pages/catalog-manager/components/AssetAssignmentDialog';
import AssetsImportDialog from '@/pages/catalog-manager/components/AssetsImportDialog';
import AssetsToolbar from '@/pages/catalog-manager/components/AssetsToolbar';
import CatalogHeader from '@/pages/catalog-manager/components/CatalogHeader';
import CatalogTableShell from '@/pages/catalog-manager/components/CatalogTableShell';
import CollaboratorActionsMenu from '@/pages/catalog-manager/components/CollaboratorActionsMenu';
import CollaboratorLinksDialog from '@/pages/catalog-manager/components/CollaboratorLinksDialog';
import CollaboratorsImportDialog from '@/pages/catalog-manager/components/CollaboratorsImportDialog';
import CollaboratorsToolbar from '@/pages/catalog-manager/components/CollaboratorsToolbar';
import ContactActionsMenu from '@/pages/catalog-manager/components/ContactActionsMenu';
import CorporateLineActionsMenu from '@/pages/catalog-manager/components/CorporateLineActionsMenu';
import CorporateLineAssignmentDialog from '@/pages/catalog-manager/components/CorporateLineAssignmentDialog';
import InfrastructureActionsMenu from '@/pages/catalog-manager/components/InfrastructureActionsMenu';
import InfrastructureImportDialog from '@/pages/catalog-manager/components/InfrastructureImportDialog';
import ImportPreviewTable from '@/pages/catalog-manager/components/ImportPreviewTable';
import MenuTriggerButton from '@/pages/catalog-manager/components/MenuTriggerButton';
import PasswordResetDialog from '@/pages/catalog-manager/components/PasswordResetDialog';
import SearchToolbar from '@/pages/catalog-manager/components/SearchToolbar';
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
import {
  downloadAssetsJsonTemplate,
  downloadAssetsTemplate,
  downloadCollaboratorsJsonTemplate,
  downloadCollaboratorsTemplate,
  downloadInfrastructureJsonTemplate,
  downloadInfrastructureTemplate,
  exportAssetsCsv,
  exportCollaboratorsCsv,
  getImportTemplateExamples,
} from '@/pages/catalog-manager/utils/importExportHelpers';
import { useActionMenu } from '@/pages/catalog-manager/hooks/useActionMenu';
import {
  countAssetsByDepartmentId,
  countAssetsByUnitId,
  countByKey,
  createAssetOptions,
  createCollaboratorOptions,
  createSelectOptions,
  indexById,
} from '@/pages/catalog-manager/utils/buildConfigLookups';
import { importInfrastructureRows } from '@/pages/catalog-manager/utils/importInfrastructureRows';
import { readImportFileRows } from '@/pages/catalog-manager/utils/importParsers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
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
  const queryClient = useQueryClient();
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

  const saveMutation = useMutation({
    mutationFn: async ({ record, payload }) => {
      if (record?.id) {
        return catalogApi[lockedEntityKey].update(record.id, payload);
      }
      return catalogApi[lockedEntityKey].create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [current.queryKey] });
      setFeedback({ type: 'success', message: 'Registro salvo com sucesso.' });
      setEditingRecord(null);
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao salvar registro.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => catalogApi[lockedEntityKey].remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [current.queryKey] });
      setFeedback({ type: 'success', message: 'Registro removido com sucesso.' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao remover registro.' });
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: async ({ id, payload }) => catalogApi.ativos.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      setFeedback({ type: 'success', message: 'Usuario vinculado com sucesso.' });
      setAssigningAsset(null);
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao vincular usuario.' });
    },
  });

  const assignCorporateLineMutation = useMutation({
    mutationFn: async ({ id, payload }) => catalogApi.linhas_corporativas.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linhas_corporativas'] });
      setFeedback({ type: 'success', message: 'Responsavel vinculado com sucesso.' });
      setAssigningCorporateLine(null);
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao vincular responsavel.' });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async ({ id, password }) => catalogApi.colaboradores.updatePassword(id, password),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Senha atualizada com sucesso.' });
      setPasswordRecord(null);
      setPasswordForm({ password: '', confirmPassword: '' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao atualizar senha.' });
    },
  });

  const importAssetsMutation = useMutation({
    mutationFn: async (rowsToImport) => {
      const unitOptions = units.map((unit) => ({ id: unit.id, normalized: normalizeText(unit.nome) }));
      const collaboratorEmailOptions = collaborators
        .filter((item) => item.email)
        .map((item) => ({ id: item.id, normalized: normalizeText(item.email) }));
      const collaboratorNameOptions = collaborators
        .filter((item) => item.nome)
        .map((item) => ({ id: item.id, normalized: normalizeText(item.nome) }));

      const created = [];
      const errors = [];

      for (let index = 0; index < rowsToImport.length; index += 1) {
        const row = rowsToImport[index];

        try {
          const unitName = normalizeText(row.unidade || row.unidade_nome);
          const collaboratorEmail = normalizeText(row.responsavel_email);
          const collaboratorName = normalizeText(row.responsavel_nome || row.responsavel);

          const unidadeId = unitName ? resolveIdByName(unitName, unitOptions) : null;
          const usuarioId = collaboratorEmail
            ? resolveIdByName(collaboratorEmail, collaboratorEmailOptions)
            : collaboratorName
              ? resolveIdByName(collaboratorName, collaboratorNameOptions)
              : null;

          if (unitName && !unidadeId) {
            throw new Error(`Unidade nao encontrada: ${row.unidade || row.unidade_nome}`);
          }

          if ((collaboratorEmail || collaboratorName) && !usuarioId) {
            throw new Error(`Responsavel nao encontrado: ${row.responsavel_email || row.responsavel_nome || row.responsavel}`);
          }

          const payload = {
            nome: row.nome || null,
            categoria: row.categoria || null,
            marca: row.marca || null,
            modelo: row.modelo || null,
            numero_serie: row.numero_serie || null,
            patrimonio: row.patrimonio || null,
            unidade_id: unidadeId || null,
            localizacao_interna: row.localizacao_interna || null,
            observacao: row.observacao || null,
            estado: row.estado || null,
            usuario_id: usuarioId || null,
          };

          if (!payload.nome) throw new Error('Nome do ativo obrigatorio.');
          if (!payload.categoria) throw new Error('Categoria do ativo obrigatoria.');
          if (!payload.numero_serie) throw new Error('Numero de serie do ativo obrigatorio.');
          if (!payload.unidade_id) throw new Error('Unidade do ativo obrigatoria.');

          const createdRow = await catalogApi.ativos.create(payload);
          created.push(createdRow);
        } catch (error) {
          errors.push(`Linha ${index + 2}: ${error.message || 'Falha ao importar.'}`);
        }
      }

      return { created, errors };
    },
    onSuccess: ({ created, errors }) => {
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      setImportAssetsOpen(false);
      setImportFile(null);
      setImportAssetsPreview([]);

      if (created.length && errors.length) {
        setFeedback({
          type: 'success',
          message: `${created.length} ativo(s) importado(s). ${errors.length} linha(s) com erro: ${errors.slice(0, 3).join(' | ')}`,
        });
        return;
      }

      if (created.length) {
        setFeedback({
          type: 'success',
          message: `${created.length} ativo(s) importado(s) com sucesso.`,
        });
        return;
      }

      setFeedback({
        type: 'error',
        message: errors[0] || 'Nenhum ativo foi importado.',
      });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao importar ativos.' });
    },
  });

  const importCollaboratorsMutation = useMutation({
    mutationFn: async (rowsToImport) => {
      const departmentOptions = departments.map((item) => ({ id: item.id, normalized: normalizeText(item.nome) }));
      const unitOptions = units.map((item) => ({ id: item.id, normalized: normalizeText(item.nome) }));
      const created = [];
      const errors = [];

      for (let index = 0; index < rowsToImport.length; index += 1) {
        const row = rowsToImport[index];

        try {
          const departamentoNome = normalizeText(row.departamento || row.departamento_nome);
          const unidadeNome = normalizeText(row.unidade || row.unidade_nome);
          const departamentoId = departamentoNome ? resolveIdByName(departamentoNome, departmentOptions) : null;
          const unidadeId = unidadeNome ? resolveIdByName(unidadeNome, unitOptions) : null;

          if (departamentoNome && !departamentoId) {
            throw new Error(`Departamento nao encontrado: ${row.departamento || row.departamento_nome}`);
          }

          if (unidadeNome && !unidadeId) {
            throw new Error(`Unidade nao encontrada: ${row.unidade || row.unidade_nome}`);
          }

          const payload = {
            nome: row.nome || null,
            email: row.email || null,
            password: row.password || null,
            funcao: row.funcao || 'usuario',
            cpf: row.cpf || null,
            telefone: row.telefone || null,
            departamento_id: departamentoId || null,
            cargo: row.cargo || null,
            data_admissao: row.data_admissao || null,
            status: row.status || 'ativo',
            unidade_id: unidadeId || null,
          };

          if (!payload.nome) throw new Error('Nome obrigatorio.');
          if (!payload.email) throw new Error('Email obrigatorio.');
          if (!payload.password) throw new Error('Password obrigatoria.');

          const createdRow = await catalogApi.colaboradores.create(payload);
          created.push(createdRow);
        } catch (error) {
          errors.push(`Linha ${index + 2}: ${error.message || 'Falha ao importar.'}`);
        }
      }

      return { created, errors };
    },
    onSuccess: ({ created, errors }) => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      setImportCollaboratorsOpen(false);
      setImportCollaboratorsFile(null);
      setImportCollaboratorsPreview([]);

      if (created.length && errors.length) {
        setFeedback({
          type: 'success',
          message: `${created.length} colaborador(es) importado(s). ${errors.length} linha(s) com erro: ${errors.slice(0, 3).join(' | ')}`,
        });
        return;
      }

      if (created.length) {
        setFeedback({ type: 'success', message: `${created.length} colaborador(es) importado(s) com sucesso.` });
        return;
      }

      setFeedback({ type: 'error', message: errors[0] || 'Nenhum colaborador foi importado.' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao importar colaboradores.' });
    },
  });

  const importInfrastructureMutation = useMutation({
    mutationFn: async (rowsToImport) => {
      const unitOptions = units.map((item) => ({ id: item.id, normalized: normalizeText(item.nome) }));
      return importInfrastructureRows({
        rowsToImport,
        unitOptions,
        normalizeText,
        resolveIdByName,
      });
    },
    onSuccess: ({ created, errors }) => {
      queryClient.invalidateQueries({ queryKey: ['infra_estrutura'] });
      setImportInfrastructureOpen(false);
      setImportInfrastructureFile(null);
      setImportInfrastructurePreview([]);

      if (created.length && errors.length) {
        setFeedback({
          type: 'success',
          message: `${created.length} registro(s) importado(s). ${errors.length} linha(s) com erro: ${errors.slice(0, 3).join(' | ')}`,
        });
        return;
      }

      if (created.length) {
        setFeedback({
          type: 'success',
          message: `${created.length} registro(s) de infraestrutura importado(s) com sucesso.`,
        });
        return;
      }

      setFeedback({
        type: 'error',
        message: errors[0] || 'Nenhum registro de infraestrutura foi importado.',
      });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao importar infraestrutura.' });
    },
  });

  const unlinkAssignmentsMutation = useMutation({
    mutationFn: async (id) => catalogApi.colaboradores.unlinkAssignments(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      queryClient.invalidateQueries({ queryKey: ['linhas_corporativas'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      const ativosCount = result?.ativos_count || 0;
      const linhasCount = result?.linhas_count || 0;
      const totalCount = result?.total_count || 0;
      setFeedback({
        type: 'success',
        message:
          totalCount > 0
            ? `${ativosCount} ativo(s) e ${linhasCount} linha(s) desvinculado(s) com sucesso.`
            : 'Nenhum item vinculado para remover.',
      });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao desvincular itens.' });
    },
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

  const handleDownloadAssetsTemplate = () => {
    downloadAssetsTemplate(getImportTemplateExamples({ collaborators, departments, units }));
  };

  const handleExportAssetsCsv = () => {
    exportAssetsCsv({ assets, collaborators, units });
  };

  const handleDownloadAssetsJsonTemplate = () => {
    downloadAssetsJsonTemplate(getImportTemplateExamples({ collaborators, departments, units }));
  };

  const handleDownloadCollaboratorsTemplate = () => {
    downloadCollaboratorsTemplate(getImportTemplateExamples({ collaborators, departments, units }));
  };

  const handleDownloadCollaboratorsJsonTemplate = () => {
    downloadCollaboratorsJsonTemplate(getImportTemplateExamples({ collaborators, departments, units }));
  };

  const handleDownloadInfrastructureTemplate = () => {
    downloadInfrastructureTemplate(getImportTemplateExamples({ collaborators, departments, units }));
  };

  const handleDownloadInfrastructureJsonTemplate = () => {
    downloadInfrastructureJsonTemplate(getImportTemplateExamples({ collaborators, departments, units }));
  };

  const handleImportAssetsClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFileSelection = async (event, onSuccess) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rowsToImport = await readImportFileRows(file);
      onSuccess(file, rowsToImport);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Falha ao ler arquivo de importacao.' });
    } finally {
      event.target.value = '';
    }
  };

  const handleImportAssetsFile = async (event) =>
    handleImportFileSelection(event, (file, rowsToImport) => {
      setImportFile(file);
      setImportAssetsPreview(rowsToImport);
    });

  const handleConfirmImportAssets = async () => {
    if (!importFile || !importAssetsPreview.length) {
      setFeedback({ type: 'error', message: 'Escolha um arquivo para importar.' });
      return;
    }

    importAssetsMutation.mutate(importAssetsPreview);
  };

  const handleExportCollaboratorsCsv = () => {
    exportCollaboratorsCsv({ collaborators, departments, units });
  };

  const handleConfirmImportCollaborators = async () => {
    if (!importCollaboratorsFile || !importCollaboratorsPreview.length) {
      setFeedback({ type: 'error', message: 'Escolha um arquivo para importar.' });
      return;
    }

    importCollaboratorsMutation.mutate(importCollaboratorsPreview);
  };

  const handleConfirmImportInfrastructure = async () => {
    if (!importInfrastructureFile || !importInfrastructurePreview.length) {
      setFeedback({ type: 'error', message: 'Escolha um arquivo para importar.' });
      return;
    }

    importInfrastructureMutation.mutate(importInfrastructurePreview);
  };

  const handleImportCollaboratorsFile = async (event) =>
    handleImportFileSelection(event, (file, rowsToImport) => {
      setImportCollaboratorsFile(file);
      setImportCollaboratorsPreview(rowsToImport);
    });

  const handleImportInfrastructureFile = async (event) =>
    handleImportFileSelection(event, (file, rowsToImport) => {
      setImportInfrastructureFile(file);
      setImportInfrastructurePreview(rowsToImport);
    });

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

  const renderDepartmentCards = () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((department) => {
        const assetsCount = current.cardStats?.assetsByDepartmentId?.[department.id] || 0;
        const collaboratorsCount = current.cardStats?.collaboratorsByDepartmentId?.[department.id] || 0;

        return (
          <Card key={department.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
            <div className="h-1.5 bg-[#d1131f]" />
            <div className="p-5">
              <div className="mb-3 flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8e8eb] text-[#d1131f]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[17px] font-bold leading-tight text-foreground">{department.nome}</h3>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                    {department.descricao || 'Descricao nao informada'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/40 p-2.5 text-center">
                  <p className="text-[22px] font-black leading-none text-[#d1131f]">{assetsCount}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Ativos</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-2.5 text-center">
                  <p className="text-[22px] font-black leading-none text-foreground">{collaboratorsCount}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Colaboradores</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" className="h-10 flex-1 gap-2 rounded-xl" onClick={() => setEditingRecord(department)}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl text-[#ff4b4b] hover:bg-red-50 hover:text-[#ff4b4b]"
                  onClick={() => deleteMutation.mutate(department.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );

  const renderUnitsCards = () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((unit) => {
        const assetsCount = current.cardStats?.assetsByUnitId?.[unit.id] || 0;
        const collaboratorsCount = current.cardStats?.collaboratorsByUnitId?.[unit.id] || 0;

        return (
          <Card key={unit.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
            <div className="h-1.5 bg-[#d1131f]" />
            <div className="p-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8e8eb] text-[#d1131f]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold leading-tight text-foreground">{unit.nome}</h3>
                    <p className="text-[13px] text-muted-foreground">{unit.cidade || 'Cidade nao informada'}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={unit.ativo ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-zinc-200 bg-zinc-100 text-zinc-700'}
                >
                  {unit.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>

              <div className="space-y-2 text-[14px] text-muted-foreground">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{unit.endereco || 'Endereco nao informado'}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{formatPhone(unit.telefone)}</span>
                </div>
                <div className="flex items-start gap-3">
                  <UserRound className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{unit.responsavel || 'Responsavel nao informado'}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/40 p-2.5 text-center">
                  <p className="text-[22px] font-black leading-none text-[#d1131f]">{assetsCount}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Ativos</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-2.5 text-center">
                  <p className="text-[22px] font-black leading-none text-foreground">{collaboratorsCount}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Colaboradores</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" className="h-10 flex-1 gap-2 rounded-xl" onClick={() => setEditingRecord(unit)}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl text-[#ff4b4b] hover:bg-red-50 hover:text-[#ff4b4b]"
                  onClick={() => deleteMutation.mutate(unit.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <CatalogHeader
        importAssetsPending={importAssetsMutation.isPending}
        importCollaboratorsPending={importCollaboratorsMutation.isPending}
        importInfrastructurePending={importInfrastructureMutation.isPending}
        lockedEntityKey={lockedEntityKey}
        onExportAssetsCsv={handleExportAssetsCsv}
        onExportCollaboratorsCsv={handleExportCollaboratorsCsv}
        onImportAssets={() => {
          setImportAssetsOpen(true);
          setImportFile(null);
        }}
        onImportCollaborators={() => {
          setImportCollaboratorsOpen(true);
          setImportCollaboratorsFile(null);
        }}
        onImportInfrastructure={() => {
          setImportInfrastructureOpen(true);
          setImportInfrastructureFile(null);
          setImportInfrastructurePreview([]);
        }}
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
          renderDepartmentCards()
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
          renderUnitsCards()
        )
      ) : (
        <CatalogTableShell columns={current.columns} entityKey={lockedEntityKey}>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={current.columns.length + 1} className="py-12 text-center text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={current.columns.length + 1} className="py-12 text-center text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={`transition-colors hover:bg-muted/30 ${
                        lockedEntityKey === 'colaboradores' ? 'cursor-pointer' : ''
                      }`}
                      onClick={
                        lockedEntityKey === 'colaboradores'
                          ? () => setViewingCollaboratorLinks(row)
                          : undefined
                      }
                    >
                      {current.columns.map((column) => (
                        <TableCell key={`${row.id}-${column.key}`} className={lockedEntityKey === 'colaboradores' ? 'py-3 text-[14px]' : ''}>
                          {column.render ? column.render(row[column.key], row) : row[column.key] || '-'}
                        </TableCell>
                      ))}
                      <TableCell
                        className={
                          lockedEntityKey === 'colaboradores' ||
                          lockedEntityKey === 'ativos' ||
                          lockedEntityKey === 'contatos' ||
                          lockedEntityKey === 'linhas_corporativas' ||
                          lockedEntityKey === 'infra_estrutura'
                            ? 'text-center'
                            : 'text-right'
                        }
                        onClick={
                          lockedEntityKey === 'colaboradores' ||
                          lockedEntityKey === 'ativos' ||
                          lockedEntityKey === 'contatos' ||
                          lockedEntityKey === 'linhas_corporativas' ||
                          lockedEntityKey === 'infra_estrutura'
                            ? (event) => event.stopPropagation()
                            : undefined
                        }
                      >
                      <div
                        className={
                          lockedEntityKey === 'colaboradores' ||
                          lockedEntityKey === 'ativos' ||
                          lockedEntityKey === 'contatos' ||
                          lockedEntityKey === 'linhas_corporativas' ||
                          lockedEntityKey === 'infra_estrutura'
                            ? 'flex justify-center gap-1'
                            : 'flex justify-end gap-1'
                        }
                      >
                        {lockedEntityKey === 'ativos' ? (
                          <MenuTriggerButton
                            onClick={(event) => toggleRowMenu(event, row, 'asset')}
                          />
                        ) : lockedEntityKey === 'contatos' ? (
                          <MenuTriggerButton
                            onClick={(event) => toggleRowMenu(event, row, 'contact')}
                          />
                        ) : lockedEntityKey === 'linhas_corporativas' ? (
                          <MenuTriggerButton
                            onClick={(event) => toggleRowMenu(event, row, 'corporateLine')}
                          />
                        ) : lockedEntityKey === 'infra_estrutura' ? (
                          <MenuTriggerButton
                            onClick={(event) => toggleRowMenu(event, row, 'infrastructure')}
                          />
                        ) : lockedEntityKey === 'colaboradores' ? (
                          <MenuTriggerButton
                            onClick={(event) => toggleRowMenu(event, row, 'collaborator')}
                          />
                        ) : null}
                        {lockedEntityKey !== 'colaboradores' &&
                        lockedEntityKey !== 'ativos' &&
                        lockedEntityKey !== 'contatos' &&
                        lockedEntityKey !== 'linhas_corporativas' &&
                        lockedEntityKey !== 'infra_estrutura' ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingRecord(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        ) : null}
                          {lockedEntityKey !== 'colaboradores' &&
                          lockedEntityKey !== 'ativos' &&
                          lockedEntityKey !== 'contatos' &&
                          lockedEntityKey !== 'linhas_corporativas' &&
                          lockedEntityKey !== 'infra_estrutura' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (lockedEntityKey === 'colaboradores') {
                                const hasLinkedAssets = assets.some((asset) => asset.usuario_id === row.id);
                                const hasLinkedLines = corporateLines.some((line) => line.colaborador_id === row.id);

                                if (hasLinkedAssets || hasLinkedLines) {
                                  setFeedback({
                                    type: 'error',
                                    message: 'Nao e permitido excluir um colaborador com itens vinculados.',
                                  });
                                  return;
                                }

                                const confirmed = window.confirm(
                                  `Deseja realmente excluir o usuario ${row.nome || row.email || ''}?`
                                );
                                if (!confirmed) return;
                              }
                              if (lockedEntityKey === 'contatos') {
                                const confirmed = window.confirm(
                                  `Deseja realmente excluir ${row.nome || 'este contato'}?`
                                );
                                if (!confirmed) return;
                              }
                              if (lockedEntityKey === 'infra_estrutura') {
                                const confirmed = window.confirm(
                                  `Deseja realmente excluir ${row.nome || 'este registro de infraestrutura'}?`
                                );
                                if (!confirmed) return;
                              }
                              if (lockedEntityKey === 'ativos') {
                                if (row.usuario_id) {
                                  setFeedback({
                                    type: 'error',
                                    message: 'Nao e permitido excluir um ativo com usuario vinculado.',
                                  });
                                  return;
                                }

                                const confirmed = window.confirm(
                                  `Deseja realmente excluir ${row.nome || row.patrimonio || 'este ativo'}?`
                                );
                                if (!confirmed) return;
                              }
                              if (lockedEntityKey === 'linhas_corporativas') {
                                if (row.colaborador_id) {
                                  setFeedback({
                                    type: 'error',
                                    message: 'Nao e permitido excluir uma linha corporativa com colaborador vinculado.',
                                  });
                                  return;
                                }

                                const confirmed = window.confirm(
                                  `Deseja realmente excluir ${row.nome || row.numero || 'esta linha corporativa'}?`
                                );
                                if (!confirmed) return;
                              }
                              deleteMutation.mutate(row.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
        </CatalogTableShell>
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

      <AssetsImportDialog
        fileName={importFile?.name}
        isPending={importAssetsMutation.isPending}
        onClose={() => {
          setImportAssetsOpen(false);
          setImportFile(null);
        }}
        onConfirm={handleConfirmImportAssets}
        onDownloadCsvTemplate={handleDownloadAssetsTemplate}
        onDownloadJsonTemplate={handleDownloadAssetsJsonTemplate}
        onFileChange={handleImportAssetsFile}
        onOpenChange={(open) => {
          setImportAssetsOpen(open);
          if (!open) {
            setImportFile(null);
            setImportAssetsPreview([]);
          }
        }}
        open={importAssetsOpen}
        preview={<ImportPreviewTable rows={importAssetsPreview} columns={[
          { key: 'nome', label: 'Nome' },
          { key: 'categoria', label: 'Categoria' },
          { key: 'patrimonio', label: 'Patrimonio' },
          { key: 'unidade', label: 'Unidade' },
          { key: 'responsavel_email', label: 'Responsavel' },
        ]} />}
      />

      <CollaboratorsImportDialog
        fileName={importCollaboratorsFile?.name}
        isPending={importCollaboratorsMutation.isPending}
        onClose={() => {
          setImportCollaboratorsOpen(false);
          setImportCollaboratorsFile(null);
        }}
        onConfirm={handleConfirmImportCollaborators}
        onDownloadCsvTemplate={handleDownloadCollaboratorsTemplate}
        onDownloadJsonTemplate={handleDownloadCollaboratorsJsonTemplate}
        onFileChange={handleImportCollaboratorsFile}
        onOpenChange={(open) => {
          setImportCollaboratorsOpen(open);
          if (!open) {
            setImportCollaboratorsFile(null);
            setImportCollaboratorsPreview([]);
          }
        }}
        open={importCollaboratorsOpen}
        preview={<ImportPreviewTable rows={importCollaboratorsPreview} columns={[
          { key: 'nome', label: 'Nome' },
          { key: 'email', label: 'Email' },
          { key: 'funcao', label: 'Funcao' },
          { key: 'departamento', label: 'Departamento' },
          { key: 'unidade', label: 'Unidade' },
        ]} />}
      />

      <InfrastructureImportDialog
        fileName={importInfrastructureFile?.name}
        isPending={importInfrastructureMutation.isPending}
        onClose={() => {
          setImportInfrastructureOpen(false);
          setImportInfrastructureFile(null);
          setImportInfrastructurePreview([]);
        }}
        onConfirm={handleConfirmImportInfrastructure}
        onDownloadCsvTemplate={handleDownloadInfrastructureTemplate}
        onDownloadJsonTemplate={handleDownloadInfrastructureJsonTemplate}
        onFileChange={handleImportInfrastructureFile}
        onOpenChange={(open) => {
          setImportInfrastructureOpen(open);
          if (!open) {
            setImportInfrastructureFile(null);
            setImportInfrastructurePreview([]);
          }
        }}
        open={importInfrastructureOpen}
        preview={<ImportPreviewTable rows={importInfrastructurePreview} columns={[
          { key: 'tipo', label: 'Tipo' },
          { key: 'nome', label: 'Nome' },
          { key: 'valor_identificador', label: 'Valor' },
          { key: 'unidade', label: 'Unidade' },
        ]} />}
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







