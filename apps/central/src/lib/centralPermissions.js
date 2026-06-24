export const CENTRAL_PERMISSION_LEVELS = {
  none: 'sem',
  view: 'ver',
  manage: 'gerenciar',
};

export const CENTRAL_PERMISSION_MODULES = [
  { key: 'dashboard', label: 'Dashboard', path: '/' },
  { key: 'ativos', label: 'Ativos', path: '/ativos' },
  { key: 'departamentos', label: 'Departamentos', path: '/departamentos' },
  { key: 'unidades', label: 'Unidades', path: '/unidades' },
  { key: 'colaboradores', label: 'Colaboradores', path: '/colaboradores' },
  { key: 'contatos', label: 'Contatos', path: '/contatos' },
  { key: 'linhas_corporativas', label: 'Linhas Corporativas', path: '/linhas-corporativas' },
  { key: 'infra_estrutura', label: 'Infraestrutura', path: '/infraestrutura' },
  { key: 'acessos_usuario_sistema', label: 'Acessos por Sistema', path: '/acessos-sistemas' },
  { key: 'logs_auditoria', label: 'Logs Auditoria', path: '/logs-auditoria' },
  { key: 'termos_posse', label: 'Termos de Posse', path: '/termos-posse' },
];

export const CENTRAL_PERMISSION_MODULE_BY_PATH = CENTRAL_PERMISSION_MODULES.reduce((acc, module) => {
  acc[module.path] = module.key;
  return acc;
}, {
  '/cargos': 'departamentos',
});

export function getCentralPermissionLevel(permissions = [], moduleKey) {
  const permission = permissions.find((item) => item.modulo === moduleKey);
  return permission?.nivel_acesso || CENTRAL_PERMISSION_LEVELS.none;
}

export function hasCentralPermission(permissions = [], moduleKey, requiredLevel = CENTRAL_PERMISSION_LEVELS.view) {
  const level = getCentralPermissionLevel(permissions, moduleKey);
  if (requiredLevel === CENTRAL_PERMISSION_LEVELS.view) {
    return level === CENTRAL_PERMISSION_LEVELS.view || level === CENTRAL_PERMISSION_LEVELS.manage;
  }
  return level === CENTRAL_PERMISSION_LEVELS.manage;
}
