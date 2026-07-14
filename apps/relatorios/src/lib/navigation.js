import { LayoutDashboard, Settings, Building2, FileText, Shield, History } from 'lucide-react';
import { canReportsFunction } from '@/api/dataClient';

export const relatoriosNavItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
  { path: '/relatorios', icon: FileText, label: 'Relatórios', adminOnly: true, managerModule: 'relatorios' },
  { path: '/unidades', icon: Building2, label: 'Unidades', adminOnly: true },
  { path: '/permissoes', icon: Shield, label: 'Permissões', adminOnly: true, managerModule: 'permissoes_relatorios' },
  { path: '/acessos', icon: Settings, label: 'Acessos', adminOnly: true },
  { path: '/logs', icon: History, label: 'Logs', adminOnly: true, managerModule: 'logs_auditoria' },
];

const PRIMARY_NAV_PATHS = ['/', '/relatorios', '/permissoes', '/logs'];

export function canViewNavItem(item, user) {
  if (!item.adminOnly || user?.role === 'admin') return true;
  if (user?.role !== 'manager') return false;
  return item.managerModule ? canReportsFunction(user?.reports_permissions, item.managerModule, 'ver') : false;
}

export function getVisibleNavItems(user) {
  return relatoriosNavItems.filter((item) => canViewNavItem(item, user));
}

export function getPrimaryNavItems(user) {
  const visible = getVisibleNavItems(user);
  const preferred = PRIMARY_NAV_PATHS.map((path) => visible.find((item) => item.path === path)).filter(Boolean);
  const rest = visible.filter((item) => !preferred.includes(item));
  return [...preferred, ...rest].slice(0, 4);
}

export function getOverflowNavItems(user) {
  const visible = getVisibleNavItems(user);
  const primary = getPrimaryNavItems(user);
  return visible.filter((item) => !primary.includes(item));
}
