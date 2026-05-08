import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Copy, Download, KeyRound, Laptop, MapPin, MapPinHouse, Monitor, Pencil, Phone, Plus, RefreshCw, Search, Trash2, Upload, UserPlus, UserRound } from 'lucide-react';

import CatalogEntityDialog from '@/components/CatalogEntityDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { catalogApi } from '@/lib/catalogApi';

const entityMeta = {
  departamentos: {
    title: 'Departamentos',
    singular: 'Departamento',
    subtitle: 'Base institucional para colaboradores e organizacao interna.',
    icon: Building2,
  },
  unidades: {
    title: 'Unidades / Filiais',
    singular: 'Unidade',
    subtitle: 'Locais disponiveis para vinculo de colaboradores.',
    icon: MapPinHouse,
  },
  colaboradores: {
    title: 'Colaboradores',
    singular: 'Colaborador',
    subtitle: '',
    icon: UserRound,
  },
  ativos: {
    title: 'Ativos',
    singular: 'Ativo',
    subtitle: '',
    icon: Laptop,
  },
};

const statusTone = {
  ativo: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  inativo: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  disponivel: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  em_uso: 'bg-blue-100 text-blue-800 border-blue-200',
  manutencao: 'bg-amber-100 text-amber-800 border-amber-200',
  descartado: 'bg-red-100 text-red-800 border-red-200',
};

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

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((header) => normalizeText(header));

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
}

function parseImportFile(text, fileName = '') {
  const extension = fileName.toLowerCase().split('.').pop();

  if (extension === 'json') {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('O JSON precisa ser um array de objetos.');
    }
    return parsed;
  }

  return parseCsv(text);
}

export default function CatalogManager({ lockedEntityKey }) {
  const queryClient = useQueryClient();
  const importInputRef = useRef(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [assigningAsset, setAssigningAsset] = useState(null);
  const [passwordRecord, setPasswordRecord] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [importAssetsOpen, setImportAssetsOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importAssetsPreview, setImportAssetsPreview] = useState([]);
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

  const departmentsQuery = useQuery({ queryKey: ['departamentos'], queryFn: catalogApi.departamentos.list });
  const unitsQuery = useQuery({ queryKey: ['unidades'], queryFn: catalogApi.unidades.list });
  const collaboratorsQuery = useQuery({ queryKey: ['colaboradores'], queryFn: catalogApi.colaboradores.list });
  const assetsQuery = useQuery({ queryKey: ['ativos'], queryFn: catalogApi.ativos.list });

  const departments = departmentsQuery.data || [];
  const units = unitsQuery.data || [];
  const collaborators = collaboratorsQuery.data || [];
  const assets = assetsQuery.data || [];

  const config = useMemo(() => {
    const departmentOptions = departments.map((item) => ({ value: item.id, label: item.nome }));
    const unitOptions = units.map((item) => ({ value: item.id, label: item.nome }));
    const collaboratorOptions = collaborators.map((item) => ({
      value: item.id,
      label: item.nome || item.email || item.id,
    }));
    const assetsByProfileId = assets.reduce((acc, asset) => {
      if (asset.usuario_id) {
        acc[asset.usuario_id] = (acc[asset.usuario_id] || 0) + 1;
      }
      return acc;
    }, {});
    const collaboratorsByDepartmentId = collaborators.reduce((acc, collaborator) => {
      if (collaborator.departamento_id) {
        acc[collaborator.departamento_id] = (acc[collaborator.departamento_id] || 0) + 1;
      }
      return acc;
    }, {});
    const collaboratorsById = collaborators.reduce((acc, collaborator) => {
      acc[collaborator.id] = collaborator;
      return acc;
    }, {});
    const assetsByDepartmentId = assets.reduce((acc, asset) => {
      const departmentId = asset.usuario_id ? collaboratorsById[asset.usuario_id]?.departamento_id : null;
      if (departmentId) {
        acc[departmentId] = (acc[departmentId] || 0) + 1;
      }
      return acc;
    }, {});
    const collaboratorsByUnitId = collaborators.reduce((acc, collaborator) => {
      if (collaborator.unidade_id) {
        acc[collaborator.unidade_id] = (acc[collaborator.unidade_id] || 0) + 1;
      }
      return acc;
    }, {});
    const assetsByUnitId = assets.reduce((acc, asset) => {
      const unitId = asset.unidade_id || null;
      if (unitId) {
        acc[unitId] = (acc[unitId] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      departamentos: {
        rows: departments,
        fields: [
          { key: 'nome', label: 'Nome', required: true, placeholder: 'Ex.: Tecnologia da Informacao' },
          { key: 'descricao', label: 'Descricao', fullWidth: true, placeholder: 'Ex.: Responsavel pela infraestrutura e sistemas internos' },
        ],
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'descricao', label: 'Descricao' },
          { key: 'atualizado_em', label: 'Atualizado em', render: (value) => formatDateTime(value) },
        ],
        cardStats: {
          collaboratorsByDepartmentId,
          assetsByDepartmentId,
        },
        searchPlaceholder: 'Buscar por nome ou descricao...',
        queryKey: 'departamentos',
      },
      unidades: {
        rows: units,
        fields: [
          { key: 'nome', label: 'Nome da Unidade', required: true, fullWidth: true, placeholder: 'ex: Macom Belem', inputClassName: 'h-10 rounded-lg border-red-400 px-3 text-[15px] focus-visible:ring-red-200' },
          { key: 'cidade', label: 'Cidade', required: true, fullWidth: true, placeholder: 'ex: Belem', inputClassName: 'h-10 rounded-lg border-zinc-200 px-3 text-[15px]' },
          { key: 'endereco', label: 'Endereco', fullWidth: true, placeholder: 'Rua, numero, bairro', inputClassName: 'h-10 rounded-lg border-zinc-200 px-3 text-[15px]' },
          { key: 'telefone', label: 'Telefone', halfWidth: true, placeholder: '(91) 3000-0000', inputClassName: 'h-10 rounded-lg border-zinc-200 px-3 text-[15px]' },
          {
            key: 'ativo',
            label: 'Status',
            type: 'select',
            valueType: 'boolean',
            halfWidth: true,
            inputClassName: 'h-10 rounded-lg border-zinc-200 px-3 text-[15px]',
            options: [
              { value: 'true', label: 'Ativa' },
              { value: 'false', label: 'Inativa' },
            ],
          },
          { key: 'responsavel', label: 'Responsavel pela Unidade', fullWidth: true, placeholder: 'Nome do gerente/responsavel', inputClassName: 'h-10 rounded-lg border-zinc-200 px-3 text-[15px]' },
        ],
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'cidade', label: 'Cidade' },
          { key: 'endereco', label: 'Endereco' },
          { key: 'telefone', label: 'Telefone', render: (value) => formatPhone(value) },
          { key: 'responsavel', label: 'Responsavel' },
          {
            key: 'ativo',
            label: 'Status',
            render: (value) => (
              <Badge variant="outline" className={value ? statusTone.ativo : statusTone.inativo}>
                {value ? 'Ativa' : 'Inativa'}
              </Badge>
            ),
          },
          { key: 'atualizado_em', label: 'Atualizado em', render: (value) => formatDateTime(value) },
        ],
        cardStats: {
          assetsByUnitId,
          collaboratorsByUnitId,
        },
        searchPlaceholder: 'Buscar por nome, cidade, endereco, telefone ou responsavel...',
        queryKey: 'unidades',
      },
      colaboradores: {
        rows: collaborators,
        fields: [
          { key: 'nome', label: 'Nome', required: true, placeholder: 'Ex.: Kevin Kley Soares' },
          { key: 'email', label: 'Email', required: true, disabled: Boolean(editingRecord?.id), placeholder: 'Ex.: kevinkleymacom@gmail.com' },
          ...(editingRecord?.id
            ? []
            : [{ key: 'password', label: 'Senha de acesso', type: 'password', required: true, placeholder: 'Minimo de 6 caracteres' }]),
          {
            key: 'funcao',
            label: 'Funcao',
            type: 'select',
            defaultValue: 'usuario',
            options: [
              { value: 'usuario', label: 'Usuario' },
              { value: 'admin', label: 'Admin' },
            ],
          },
          {
            key: 'cpf',
            label: 'CPF',
            placeholder: 'Ex.: 12345678901',
            inputMode: 'numeric',
            digitsOnly: true,
            maxLength: 11,
            validate: (value) =>
              value && !hasExactDigits(value, 11) ? 'CPF deve conter exatamente 11 digitos.' : '',
          },
          {
            key: 'telefone',
            label: 'Telefone',
            placeholder: 'Ex.: 85999999999',
            inputMode: 'numeric',
            digitsOnly: true,
            maxLength: 11,
            validate: (value) =>
              value && !hasExactDigits(value, 11) ? 'Telefone deve conter exatamente 11 digitos.' : '',
          },
          {
            key: 'departamento_id',
            label: 'Departamento',
            type: 'select',
            allowEmpty: true,
            emptyLabel: 'Sem departamento',
            options: departmentOptions,
          },
          { key: 'cargo', label: 'Cargo', placeholder: 'Ex.: Analista de TI' },
          { key: 'data_admissao', label: 'Data de admissao', type: 'date' },
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            defaultValue: 'ativo',
            options: [
              { value: 'ativo', label: 'Ativo' },
              { value: 'inativo', label: 'Inativo' },
            ],
          },
          {
            key: 'unidade_id',
            label: 'Unidade',
            type: 'select',
            allowEmpty: true,
            emptyLabel: 'Sem unidade',
            options: unitOptions,
          },
        ],
        columns: [
          {
            key: 'nome',
            label: 'Nome',
            render: (value, row) => (
              <div>
                <p className="text-[14px] font-semibold leading-5 text-foreground">{value || '-'}</p>
                <p className="text-[12px] leading-4 text-muted-foreground">{row.email || '-'}</p>
              </div>
            ),
          },
          { key: 'telefone', label: 'Telefone', render: (value) => <span className="text-[14px]">{formatPhone(value)}</span> },
          {
            key: 'equipamentos_vinculados',
            label: 'Equipamentos',
            render: (_, row) => (
              <div className="flex items-center gap-1.5 text-[14px]">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{assetsByProfileId[row.id] || 0}</span>
              </div>
            ),
          },
          {
            key: 'departamento_id',
            label: 'Departamento',
            render: (value) => {
              const label = departments.find((item) => item.id === value)?.nome || '—';
              return <span className="rounded-md border border-border px-3 py-1 text-[13px] leading-none">{label}</span>;
            },
          },
          { key: 'cargo', label: 'Cargo', render: (value) => value || '—' },
          {
            key: 'funcao',
            label: 'Acesso',
            render: (value) => (
              <span
                className={`rounded-md px-3 py-1 text-[13px] font-semibold leading-none ${
                  value === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {value === 'admin' ? 'Admin' : 'User'}
              </span>
            ),
          },
          {
            key: 'unidade_id',
            label: 'Unidade',
            render: (value) => units.find((item) => item.id === value)?.nome || '—',
          },
          {
            key: 'status',
            label: 'Status',
            render: (value) => (
              <Badge variant="outline" className={`text-[13px] ${statusTone[value] || statusTone.inativo}`}>
                {value || '-'}
              </Badge>
            ),
          },
        ],
        searchPlaceholder: 'Buscar por nome, email ou CPF...',
        queryKey: 'colaboradores',
      },
      ativos: {
        rows: assets,
        fields: [
          { key: 'nome', label: 'Nome', required: true, placeholder: 'Ex.: Notebook Dell Latitude 5440', inputClassName: 'h-9 rounded-lg px-3 text-[14px]' },
          {
            key: 'categoria',
            label: 'Categoria',
            type: 'select',
            required: true,
            inputClassName: 'h-9 rounded-lg px-3 text-[14px]',
            options: [
              { value: 'notebook', label: 'Notebook' },
              { value: 'desktop', label: 'Desktop' },
              { value: 'monitor', label: 'Monitor' },
              { value: 'impressora', label: 'Impressora' },
              { value: 'celular', label: 'Celular' },
              { value: 'tablet', label: 'Tablet' },
              { value: 'periferico', label: 'Periferico' },
              { value: 'rede', label: 'Equipamento de rede' },
              { value: 'servidor', label: 'Servidor' },
              { value: 'outro', label: 'Outro' },
            ],
          },
          { key: 'marca', label: 'Marca', placeholder: 'Ex.: Dell', inputClassName: 'h-9 rounded-lg px-3 text-[14px]' },
          { key: 'modelo', label: 'Modelo', placeholder: 'Ex.: Latitude 5440', inputClassName: 'h-9 rounded-lg px-3 text-[14px]' },
          { key: 'numero_serie', label: 'Numero de serie', required: true, placeholder: 'Ex.: SN123456789', inputClassName: 'h-9 rounded-lg px-3 text-[14px]' },
          { key: 'patrimonio', label: 'Patrimonio', placeholder: 'Ex.: MAC-AT-00125', inputClassName: 'h-9 rounded-lg px-3 text-[14px]' },
          {
            key: 'unidade_id',
            label: 'Unidade',
            type: 'select',
            required: true,
            inputClassName: 'h-9 rounded-lg px-3 text-[14px]',
            options: unitOptions,
          },
          { key: 'localizacao_interna', label: 'Localizacao interna', placeholder: 'Ex.: Sala TI / Rack 02 / Mesa 14', inputClassName: 'h-9 rounded-lg px-3 text-[14px]' },
          { key: 'observacao', label: 'Observacao', fullWidth: true, placeholder: 'Ex.: Equipamento reserva para equipe comercial', inputClassName: 'h-9 rounded-lg px-3 text-[14px]' },
          {
            key: 'estado',
            label: 'Estado',
            type: 'select',
            inputClassName: 'h-9 rounded-lg px-3 text-[14px]',
            options: [
              { value: 'novo', label: 'Novo' },
              { value: 'bom', label: 'Bom' },
              { value: 'regular', label: 'Regular' },
              { value: 'ruim', label: 'Ruim' },
              { value: 'inservivel', label: 'Inservivel' },
            ],
          },
          {
            key: 'usuario_id',
            label: 'Usuario vinculado',
            type: 'select',
            allowEmpty: true,
            emptyLabel: 'Sem usuario',
            placeholder: 'Selecione um usuario',
            inputClassName: 'h-9 rounded-lg px-3 text-[14px]',
            options: collaboratorOptions,
          },
        ],
        columns: [
          { key: 'patrimonio', label: 'Codigo', render: (value, row) => value || row.id?.slice(0, 8) || '-' },
          { key: 'nome', label: 'Equipamento', render: (value) => <span className="font-bold text-foreground">{value || '-'}</span> },
          { key: 'categoria', label: 'Categoria', render: (value) => value || '-' },
          { key: 'numero_serie', label: 'Nº Serie' },
          {
            key: 'status',
            label: 'Status',
            render: (value) => (
              <Badge variant="outline" className={statusTone[value] || statusTone.inativo}>
                {value === 'em_uso' ? 'Em uso' : value || '-'}
              </Badge>
            ),
          },
          {
            key: 'unidade_id',
            label: 'Unidade',
            render: (value) => units.find((item) => item.id === value)?.nome || '—',
          },
          {
            key: 'usuario_id',
            label: 'Responsavel',
            render: (value) => collaborators.find((item) => item.id === value)?.nome || '—',
          },
        ],
        searchPlaceholder: 'Buscar por nome, codigo, serie ou responsavel...',
        queryKey: 'ativos',
      },
    };
  }, [assets, collaborators, departments, editingRecord?.id, units]);

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

  const unlinkAssetsMutation = useMutation({
    mutationFn: async (id) => catalogApi.colaboradores.unlinkAssets(id),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      setFeedback({
        type: 'success',
        message: count > 0 ? `${count} ativo(s) desvinculado(s) com sucesso.` : 'Nenhum ativo vinculado para remover.',
      });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao desvincular ativos.' });
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
    const csv = [
      'nome,categoria,marca,modelo,numero_serie,patrimonio,unidade,localizacao_interna,observacao,estado,responsavel_email',
      'Notebook Dell Latitude 5440,notebook,Dell,Latitude 5440,SN123456789,MAC-AT-001,Macom Belem,Sala TI / Mesa 01,Equipamento principal,bom,kevinkleymacom@gmail.com',
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-ativos.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAssetsCsv = () => {
    const unitById = new Map(units.map((unit) => [unit.id, unit.nome]));
    const collaboratorById = new Map(
      collaborators.map((item) => [item.id, item.email || item.nome || ''])
    );

    const header = [
      'nome',
      'categoria',
      'marca',
      'modelo',
      'numero_serie',
      'patrimonio',
      'unidade',
      'localizacao_interna',
      'observacao',
      'estado',
      'responsavel_email',
    ];

    const escapeCsv = (value) => {
      const text = String(value ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const rows = assets.map((asset) => [
      asset.nome,
      asset.categoria,
      asset.marca,
      asset.modelo,
      asset.numero_serie,
      asset.patrimonio,
      unitById.get(asset.unidade_id) || '',
      asset.localizacao_interna,
      asset.observacao,
      asset.estado,
      collaboratorById.get(asset.usuario_id) || '',
    ]);

    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ativos-exportados.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAssetsJsonTemplate = () => {
    const jsonModel = [
      {
        nome: 'Notebook Dell Latitude 5440',
        categoria: 'notebook',
        marca: 'Dell',
        modelo: 'Latitude 5440',
        numero_serie: 'SN123456789',
        patrimonio: 'MAC-AT-001',
        unidade: 'Macom Belem',
        localizacao_interna: 'Sala TI / Mesa 01',
        observacao: 'Equipamento principal',
        estado: 'bom',
        responsavel_email: 'kevinkleymacom@gmail.com',
      },
    ];

    const blob = new Blob([JSON.stringify(jsonModel, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-ativos.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCollaboratorsTemplate = () => {
    const csv = [
      'nome,email,password,funcao,cpf,telefone,departamento,cargo,data_admissao,status,unidade',
      'Maria Souza,maria.souza@empresa.com.br,Temp.123456,usuario,11122233344,91999999999,Administrativo,Assistente,2026-05-07,ativo,Macom Ananindeua',
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-colaboradores.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCollaboratorsJsonTemplate = () => {
    const jsonModel = [
      {
        nome: 'Maria Souza',
        email: 'maria.souza@empresa.com.br',
        password: 'Temp.123456',
        funcao: 'usuario',
        cpf: '11122233344',
        telefone: '91999999999',
        departamento: 'Administrativo',
        cargo: 'Assistente',
        data_admissao: '2026-05-07',
        status: 'ativo',
        unidade: 'Macom Ananindeua',
      },
    ];

    const blob = new Blob([JSON.stringify(jsonModel, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-colaboradores.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAssetsClick = () => {
    importInputRef.current?.click();
  };

  const handleImportAssetsFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      const text = await file.text();
      const rowsToImport = parseImportFile(text, file.name);

      if (!rowsToImport.length) {
        setFeedback({ type: 'error', message: 'Arquivo vazio ou invalido.' });
        return;
      }

      setImportFile(file);
      setImportAssetsPreview(rowsToImport);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Falha ao ler arquivo de importacao.' });
    }
  };

  const handleConfirmImportAssets = async () => {
    if (!importFile || !importAssetsPreview.length) {
      setFeedback({ type: 'error', message: 'Escolha um arquivo para importar.' });
      return;
    }

    importAssetsMutation.mutate(importAssetsPreview);
  };

  const handleExportCollaboratorsCsv = () => {
    const departmentById = new Map(departments.map((item) => [item.id, item.nome]));
    const unitById = new Map(units.map((item) => [item.id, item.nome]));
    const header = ['nome', 'email', 'funcao', 'cpf', 'telefone', 'departamento', 'cargo', 'data_admissao', 'status', 'unidade'];

    const escapeCsv = (value) => {
      const text = String(value ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const rows = collaborators.map((item) => [
      item.nome,
      item.email,
      item.funcao,
      item.cpf,
      item.telefone,
      departmentById.get(item.departamento_id) || '',
      item.cargo,
      item.data_admissao ? String(item.data_admissao).slice(0, 10) : '',
      item.status,
      unitById.get(item.unidade_id) || '',
    ]);

    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'colaboradores-exportados.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmImportCollaborators = async () => {
    if (!importCollaboratorsFile || !importCollaboratorsPreview.length) {
      setFeedback({ type: 'error', message: 'Escolha um arquivo para importar.' });
      return;
    }

    importCollaboratorsMutation.mutate(importCollaboratorsPreview);
  };

  const handleImportCollaboratorsFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rowsToImport = parseImportFile(text, file.name);

      if (!rowsToImport.length) {
        setFeedback({ type: 'error', message: 'Arquivo vazio ou invalido.' });
        return;
      }

      setImportCollaboratorsFile(file);
      setImportCollaboratorsPreview(rowsToImport);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Falha ao ler arquivo de importacao.' });
    }
  };

  const renderImportPreview = (rowsToImport, columns) => {
    if (!rowsToImport.length) return null;

    const previewRows = rowsToImport.slice(0, 5);

    return (
      <div className="space-y-2 rounded-md border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">Preview antes de importar</p>
          <span className="text-xs text-muted-foreground">
            {rowsToImport.length} linha(s) encontrada(s)
          </span>
        </div>
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="bg-muted/40">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-3 py-2 font-semibold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={`${index}-${row.email || row.nome || row.patrimonio || 'preview'}`} className="border-t">
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2 text-muted-foreground">
                      {row[column.key] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rowsToImport.length > 5 ? (
          <p className="text-xs text-muted-foreground">Mostrando as 5 primeiras linhas para conferencia.</p>
        ) : null}
      </div>
    );
  };

  const isLoading =
    lockedEntityKey === 'departamentos'
      ? departmentsQuery.isLoading
      : lockedEntityKey === 'unidades'
        ? unitsQuery.isLoading
        : lockedEntityKey === 'colaboradores'
          ? collaboratorsQuery.isLoading
          : assetsQuery.isLoading;

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

  const renderAssetsToolbar = () => {
    const categoryOptions = [...new Set(assets.map((item) => item.categoria).filter(Boolean))];

    return (
      <Card className="rounded-2xl p-3 shadow-sm">
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,text/csv,.json,application/json"
          className="hidden"
          onChange={handleImportAssetsFile}
        />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={current.searchPlaceholder}
              className="h-9 rounded-lg pl-10 text-[13px]"
            />
          </div>

          <Select value={assetStatusFilter} onValueChange={setAssetStatusFilter}>
            <SelectTrigger className="h-9 rounded-lg text-[13px]">
              <SelectValue placeholder="Todos Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="disponivel">Disponivel</SelectItem>
              <SelectItem value="em_uso">Em uso</SelectItem>
              <SelectItem value="manutencao">Manutencao</SelectItem>
              <SelectItem value="descartado">Descartado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assetCategoryFilter} onValueChange={setAssetCategoryFilter}>
            <SelectTrigger className="h-9 rounded-lg text-[13px]">
              <SelectValue placeholder="Todas Categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {categoryOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assetUnitFilter} onValueChange={setAssetUnitFilter}>
            <SelectTrigger className="h-9 rounded-lg text-[13px]">
              <SelectValue placeholder="Todas Unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Unidades</SelectItem>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>
    );
  };

  const renderCollaboratorsToolbar = () => (
    <Card className="p-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, telefone ou departamento..."
            className="h-10 rounded-xl pl-10 text-[14px]"
          />
        </div>

        <Select value={collaboratorUnitFilter} onValueChange={setCollaboratorUnitFilter}>
          <SelectTrigger className="h-10 w-full rounded-xl text-[13px] md:w-[180px]">
            <SelectValue placeholder="Todas Unidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Unidades</SelectItem>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={collaboratorDepartmentFilter} onValueChange={setCollaboratorDepartmentFilter}>
          <SelectTrigger className="h-10 w-full rounded-xl text-[13px] md:w-[180px]">
            <SelectValue placeholder="Todos Departamentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Departamentos</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={collaboratorStatusFilter} onValueChange={setCollaboratorStatusFilter}>
          <SelectTrigger className="h-10 w-full rounded-xl text-[13px] md:w-[160px]">
            <SelectValue placeholder="Todos Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{entityMeta[lockedEntityKey].title}</h1>
          {lockedEntityKey !== 'unidades' && lockedEntityKey !== 'departamentos' && entityMeta[lockedEntityKey].subtitle ? (
            <p className="mt-1 text-muted-foreground">{entityMeta[lockedEntityKey].subtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {lockedEntityKey === 'ativos' ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 rounded-xl px-4 text-[14px]"
                onClick={handleExportAssetsCsv}
              >
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 rounded-xl px-4 text-[14px]"
                onClick={() => {
                  setImportAssetsOpen(true);
                  setImportFile(null);
                }}
                disabled={importAssetsMutation.isPending}
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
                onClick={handleExportCollaboratorsCsv}
              >
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 rounded-xl px-4 text-[14px]"
                onClick={() => {
                  setImportCollaboratorsOpen(true);
                  setImportCollaboratorsFile(null);
                }}
                disabled={importCollaboratorsMutation.isPending}
              >
                <Upload className="h-4 w-4" /> Importar
              </Button>
            </>
          ) : null}
          <Button
            onClick={() => setEditingRecord({})}
            className={`h-10 gap-2 rounded-xl px-4 ${
              lockedEntityKey === 'unidades' || lockedEntityKey === 'departamentos' || lockedEntityKey === 'ativos'
                ? 'bg-[#d1131f] hover:bg-[#b50f1a]'
                : ''
            }`}
          >
            <Plus className="h-4 w-4" /> Novo {entityMeta[lockedEntityKey].singular}
          </Button>
        </div>
      </div>

      {feedback ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {lockedEntityKey === 'unidades' || lockedEntityKey === 'departamentos' ? null : lockedEntityKey === 'ativos' ? (
        renderAssetsToolbar()
      ) : lockedEntityKey === 'colaboradores' ? (
        renderCollaboratorsToolbar()
      ) : (
        <Card className="p-4">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={current.searchPlaceholder} />
        </Card>
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
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {current.columns.map((column) => (
                    <TableHead key={column.key} className={lockedEntityKey === 'colaboradores' ? 'text-[13px] font-semibold' : 'font-bold'}>
                      {column.label}
                    </TableHead>
                  ))}
                  <TableHead className={lockedEntityKey === 'colaboradores' ? 'text-right text-[13px] font-semibold' : 'text-right font-bold'}>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                    <TableRow key={row.id} className="transition-colors hover:bg-muted/30">
                      {current.columns.map((column) => (
                        <TableCell key={`${row.id}-${column.key}`} className={lockedEntityKey === 'colaboradores' ? 'py-3 text-[14px]' : ''}>
                          {column.render ? column.render(row[column.key], row) : row[column.key] || '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {lockedEntityKey === 'ativos' ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAssigningAsset(row)}>
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        ) : lockedEntityKey === 'colaboradores' ? (
                          <>
                            {row.status === 'inativo' && assets.some((asset) => asset.usuario_id === row.id) ? (
                              <Button
                                variant="ghost"
                                className="h-8 px-2 text-[12px] font-medium"
                                onClick={() => {
                                  const confirmed = window.confirm(
                                    `Deseja realmente desvincular todos os ativos de ${row.nome || 'este colaborador'}?`
                                  );
                                  if (confirmed) {
                                    unlinkAssetsMutation.mutate(row.id);
                                  }
                                }}
                                disabled={unlinkAssetsMutation.isPending}
                              >
                                Desvinc.
                              </Button>
                            ) : null}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPasswordRecord(row)}>
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingRecord(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (lockedEntityKey === 'colaboradores') {
                                const confirmed = window.confirm(
                                  `Deseja realmente excluir o usuario ${row.nome || row.email || ''}?`
                                );
                                if (!confirmed) return;
                              }
                              deleteMutation.mutate(row.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {editingRecord !== null ? (
        <CatalogEntityDialog
          open={editingRecord !== null}
          onOpenChange={(open) => {
            if (!open) setEditingRecord(null);
          }}
          title={lockedEntityKey === 'unidades' ? `${editingRecord?.id ? 'Editar' : 'Nova'} Unidade` : `${editingRecord?.id ? 'Editar' : 'Novo'} ${entityMeta[lockedEntityKey].singular}`}
          description={
            lockedEntityKey === 'colaboradores'
              ? ''
              : lockedEntityKey === 'ativos'
                ? ''
                : 'Edite apenas os campos que existem hoje no banco.'
          }
          record={editingRecord?.id ? editingRecord : null}
          fields={current.fields}
          loading={saveMutation.isPending}
          hideDescription={lockedEntityKey === 'unidades'}
          dialogClassName={
            lockedEntityKey === 'unidades'
              ? 'max-w-[520px] rounded-[16px] border-0 bg-[#fdfdfd] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.18)]'
              : lockedEntityKey === 'ativos'
                ? 'max-w-[460px] rounded-[12px] p-3.5'
              : undefined
          }
          formClassName={
            lockedEntityKey === 'unidades'
              ? 'grid gap-5 sm:grid-cols-2'
              : lockedEntityKey === 'ativos'
                ? 'grid gap-2.5 sm:grid-cols-2'
              : undefined
          }
          footerClassName={lockedEntityKey === 'unidades' ? 'mt-1 justify-end gap-2 sm:space-x-0' : undefined}
          cancelLabel={lockedEntityKey === 'unidades' ? 'Cancelar' : undefined}
          submitLabel={
            lockedEntityKey === 'unidades'
              ? editingRecord?.id
                ? 'Salvar'
                : 'Cadastrar'
              : undefined
          }
          cancelButtonClassName={lockedEntityKey === 'unidades' ? 'h-10 rounded-lg px-6 text-[15px]' : undefined}
          submitButtonClassName={
            lockedEntityKey === 'unidades'
              ? 'h-10 rounded-lg bg-[#d1131f] px-6 text-[15px] text-white hover:bg-[#b50f1a]'
              : lockedEntityKey === 'ativos'
                ? 'h-8 rounded-lg px-4 text-[13px]'
              : undefined
          }
          onSubmit={(payload) => saveMutation.mutateAsync({ record: editingRecord?.id ? editingRecord : null, payload })}
        />
      ) : null}

      {assigningAsset !== null ? (
        <CatalogEntityDialog
          open={assigningAsset !== null}
          onOpenChange={(open) => {
            if (!open) setAssigningAsset(null);
          }}
          title="Vincular Usuario"
          description=""
          hideDescription
          record={assigningAsset}
          fields={[
            {
              key: 'usuario_id',
              label: 'Usuario',
              type: 'select',
              allowEmpty: true,
              emptyLabel: 'Sem usuario',
              placeholder: 'Selecione um usuario',
              inputClassName: 'h-9 rounded-lg px-3 text-[14px]',
              options: collaborators.map((item) => ({
                value: item.id,
                label: item.nome || item.email || item.id,
              })),
            },
          ]}
          loading={assignUserMutation.isPending}
          dialogClassName="max-w-[380px] rounded-[12px] p-4"
          formClassName="grid gap-3"
          footerClassName="justify-end gap-2 sm:space-x-0"
          cancelButtonClassName="h-8 rounded-lg px-4 text-[13px]"
          submitButtonClassName="h-8 rounded-lg px-4 text-[13px]"
          submitLabel="Salvar"
          onSubmit={(payload) => assignUserMutation.mutateAsync({ id: assigningAsset.id, payload })}
        />
      ) : null}

      <Dialog
        open={importAssetsOpen}
        onOpenChange={(open) => {
          setImportAssetsOpen(open);
          if (!open) {
            setImportFile(null);
            setImportAssetsPreview([]);
          }
        }}
      >
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
                <button type="button" className="text-[#d1131f] hover:underline" onClick={handleDownloadAssetsTemplate}>
                  Baixar modelo CSV
                </button>
                <button type="button" className="text-[#d1131f] hover:underline" onClick={handleDownloadAssetsJsonTemplate}>
                  Baixar modelo JSON
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="file"
                accept=".csv,text/csv,.json,application/json"
                className="w-full text-sm"
                onChange={handleImportAssetsFile}
              />
              {importFile ? <p className="text-xs text-muted-foreground">{importFile.name}</p> : null}
            </div>

            {renderImportPreview(importAssetsPreview, [
              { key: 'nome', label: 'Nome' },
              { key: 'categoria', label: 'Categoria' },
              { key: 'patrimonio', label: 'Patrimonio' },
              { key: 'unidade', label: 'Unidade' },
              { key: 'responsavel_email', label: 'Responsavel' },
            ])}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setImportAssetsOpen(false);
                  setImportFile(null);
                }}
              >
                Fechar
              </Button>
              <Button type="button" className="gap-2" onClick={handleConfirmImportAssets} disabled={importAssetsMutation.isPending}>
                <Upload className="h-4 w-4" /> {importAssetsMutation.isPending ? 'Importando' : 'Importar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importCollaboratorsOpen}
        onOpenChange={(open) => {
          setImportCollaboratorsOpen(open);
          if (!open) {
            setImportCollaboratorsFile(null);
            setImportCollaboratorsPreview([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">Importar Colaboradores</DialogTitle>
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
                nome,email,password,funcao,cpf,telefone,departamento,cargo,data_admissao,status,unidade
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <button type="button" className="text-[#d1131f] hover:underline" onClick={handleDownloadCollaboratorsTemplate}>
                  Baixar modelo CSV
                </button>
                <button type="button" className="text-[#d1131f] hover:underline" onClick={handleDownloadCollaboratorsJsonTemplate}>
                  Baixar modelo JSON
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="file"
                accept=".csv,text/csv,.json,application/json"
                className="w-full text-sm"
                onChange={handleImportCollaboratorsFile}
              />
              {importCollaboratorsFile ? <p className="text-xs text-muted-foreground">{importCollaboratorsFile.name}</p> : null}
            </div>

            {renderImportPreview(importCollaboratorsPreview, [
              { key: 'nome', label: 'Nome' },
              { key: 'email', label: 'Email' },
              { key: 'funcao', label: 'Funcao' },
              { key: 'departamento', label: 'Departamento' },
              { key: 'unidade', label: 'Unidade' },
            ])}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setImportCollaboratorsOpen(false);
                  setImportCollaboratorsFile(null);
                }}
              >
                Fechar
              </Button>
              <Button
                type="button"
                className="gap-2"
                onClick={handleConfirmImportCollaborators}
                disabled={importCollaboratorsMutation.isPending}
              >
                <Upload className="h-4 w-4" /> {importCollaboratorsMutation.isPending ? 'Importando' : 'Importar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {passwordRecord !== null ? (
        <Dialog
          open={passwordRecord !== null}
          onOpenChange={(open) => {
            if (!open) {
              setPasswordRecord(null);
              setPasswordForm({ password: '', confirmPassword: '' });
            }
          }}
        >
          <DialogContent className="max-w-[420px] rounded-[12px] p-4">
            <DialogHeader>
              <DialogTitle>Definir nova senha</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="new-password">
                  Nova senha
                </label>
                <div className="flex gap-2">
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordForm.password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Minimo de 6 caracteres"
                    className="h-9 rounded-lg px-3 text-[14px]"
                  />
                  <Button type="button" variant="outline" className="h-9 rounded-lg px-3" onClick={handleGeneratePassword}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg px-3"
                    onClick={handleCopyPassword}
                    disabled={!passwordForm.password}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="confirm-password">
                  Confirmar senha
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  placeholder="Repita a nova senha"
                  className="h-9 rounded-lg px-3 text-[14px]"
                />
              </div>
            </div>

            <DialogFooter className="justify-end gap-2 sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg px-4 text-[13px]"
                onClick={() => {
                  setPasswordRecord(null);
                  setPasswordForm({ password: '', confirmPassword: '' });
                }}
                disabled={passwordMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="h-8 rounded-lg px-4 text-[13px]"
                onClick={handleSubmitPassword}
                disabled={passwordMutation.isPending}
              >
                Salvar senha
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
