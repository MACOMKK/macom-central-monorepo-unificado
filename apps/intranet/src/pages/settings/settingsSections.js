import { Network, UserCog, UserRoundCheck } from 'lucide-react';

import ModulePermissionsSection from './sections/ModulePermissionsSection';
import NetworkAccessSection from './sections/NetworkAccessSection';
import ProfileRequestsSection from './sections/ProfileRequestsSection';

export const settingsSections = [
  {
    key: 'module-permissions',
    group: 'Acesso',
    label: 'Permissoes por modulo',
    description: 'Acesso de usuarios a cada area da intranet.',
    icon: UserCog,
    component: ModulePermissionsSection,
  },
  {
    key: 'profile-requests',
    group: 'Acesso',
    label: 'Solicitacoes de perfil',
    description: 'Aprovacao de trocas de departamento e unidade.',
    icon: UserRoundCheck,
    component: ProfileRequestsSection,
  },
  {
    key: 'network',
    group: 'Acesso',
    label: 'Acesso por rede',
    description: 'IPs publicos liberados para entrada automatica.',
    icon: Network,
    component: NetworkAccessSection,
  },
];
