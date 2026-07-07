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
