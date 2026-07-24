import { Banknote, Package, Phone, ShoppingCart, UsersRound, Wrench } from 'lucide-react';

// Módulos do sistema SERVIÇOS. Só "financeiro" está implementado hoje (era o app pagamentos);
// os demais aparecem no menu como "em breve" até ganharem backend/telas próprias.
export const servicosModules = [
  { key: 'atendimento', label: 'Atendimento', icon: Phone, path: '/atendimento', comingSoon: true },
  { key: 'oficina', label: 'Oficina', icon: Wrench, path: '/oficina', comingSoon: true },
  { key: 'financeiro', label: 'Financeiro', icon: Banknote, path: '/solicitacoes', comingSoon: false },
  { key: 'estoque', label: 'Estoque', icon: Package, path: '/estoque', comingSoon: true },
  { key: 'compras', label: 'Compras', icon: ShoppingCart, path: '/compras', comingSoon: true },
  { key: 'rh', label: 'RH', icon: UsersRound, path: '/rh', comingSoon: true },
];
