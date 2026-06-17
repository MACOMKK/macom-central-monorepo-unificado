import {
  BookOpen,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Link2,
  Megaphone,
  MessageSquarePlus,
  Users,
} from 'lucide-react';

export const intranetNavItems = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/avisos', label: 'Mural de Avisos', icon: Megaphone, module: 'avisos' },
  { path: '/links', label: 'Links Úteis', icon: Link2, module: 'links' },
  { path: '/colaboradores', label: 'Colaboradores', icon: Users, module: 'colaboradores' },
  { path: '/documentos', label: 'Documentos', icon: FileText, module: 'documentos' },
  { path: '/calendario', label: 'Agenda', icon: CalendarDays, module: 'calendario' },
  { path: '/feedback', label: 'Feedback & Sugestões', icon: MessageSquarePlus, module: 'feedback' },
  { path: '/conhecimento', label: 'Base de Conhecimento', icon: BookOpen, module: 'conhecimento' },
];

export function canViewModule(module, user) {
  if (!module) return true;
  if (user?.role === 'admin') return true;

  const level = user?.permissions?.[module] ?? 'view';
  return level === 'view' || level === 'edit';
}

export function canViewNavItem(item, user) {
  return canViewModule(item.module, user);
}
