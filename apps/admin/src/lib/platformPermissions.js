export const PERMISSION_LEVELS = {
  none: 'sem',
  view: 'ver',
  manage: 'gerenciar',
};

export const levelOptions = [
  { value: PERMISSION_LEVELS.none, label: 'Sem acesso' },
  { value: PERMISSION_LEVELS.view, label: 'Ver' },
  { value: PERMISSION_LEVELS.manage, label: 'Gerenciar' },
];

export const centralModules = [
  { key: 'ativos', label: 'Ativos' },
  { key: 'departamentos', label: 'Departamentos' },
  { key: 'cargos', label: 'Cargos' },
  { key: 'unidades', label: 'Unidades' },
  { key: 'colaboradores', label: 'Colaboradores' },
  { key: 'contatos', label: 'Contatos' },
  { key: 'linhas_corporativas', label: 'Linhas Corporativas' },
  { key: 'infra_estrutura', label: 'Infraestrutura' },
  { key: 'acessos_usuario_sistema', label: 'Acessos por Sistema' },
  { key: 'logs_auditoria', label: 'Logs Auditoria' },
  { key: 'termos_posse', label: 'Termos de Posse' },
];

export const reportsModules = [
  { key: 'relatorios', label: 'Relatorios' },
  { key: 'permissoes_relatorios', label: 'Permissoes de usuarios' },
  { key: 'avisos_relatorios', label: 'Avisos' },
  { key: 'logs_auditoria', label: 'Logs de auditoria' },
];

export const permissionSystems = [
  {
    key: 'central',
    label: 'Central',
    description: 'Gestao de estoque/TI, ativos, colaboradores e operacao administrativa.',
    status: 'active',
    route: '/',
    devPort: 5173,
    modules: centralModules,
  },
  {
    key: 'relatorios',
    label: 'Relatorios',
    description: 'Paineis, analises e permissoes especificas de relatorios.',
    status: 'active',
    route: '/',
    devPort: 5174,
    modules: reportsModules,
  },
  {
    key: 'intranet',
    label: 'Intranet',
    description: 'Comunicacao interna, conteudos corporativos e comunicados.',
    status: 'planned',
    route: '/',
    devPort: 5175,
    modules: [],
  },
  {
    key: 'pagamentos',
    label: 'Pagamentos',
    description: 'Fluxo futuro de solicitacoes e aprovacoes de pagamento.',
    status: 'planned',
    route: '/',
    devPort: null,
    modules: [],
  },
  {
    key: 'crm',
    label: 'CRM',
    description: 'Relacionamento comercial, leads e acompanhamento de oportunidades.',
    status: 'active',
    route: '/',
    devPort: 5172,
    modules: [
      { key: 'leads', label: 'Leads' },
      { key: 'clientes', label: 'Clientes' },
      { key: 'atividades', label: 'Atividades' },
    ],
  },
  {
    key: 'rh',
    label: 'RH',
    description: 'Estrutura reservada para processos e rotinas de recursos humanos.',
    status: 'planned',
    route: '/',
    devPort: null,
    modules: [],
  },
];
