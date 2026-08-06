import { Banknote, CheckCircle2, Package, Phone, Receipt, ShoppingCart, UsersRound, Wrench } from 'lucide-react';

// Módulos do sistema SERVIÇOS. Só "financeiro" está implementado hoje (era o app pagamentos);
// os demais aparecem no menu como "em breve" até ganharem backend/telas próprias.
// `children` é opcional: um módulo com filhos vira um submenu expansível no Layout;
// `requires` num filho condiciona a exibição a `user?.[requires]`.
export const servicosModules = [
  { key: 'atendimento', label: 'Atendimento', icon: Phone, path: '/atendimento', comingSoon: true },
  { key: 'oficina', label: 'Oficina', icon: Wrench, path: '/oficina', comingSoon: true },
  {
    key: 'financeiro',
    label: 'Financeiro',
    icon: Banknote,
    path: '/solicitacoes',
    comingSoon: false,
    children: [
      { key: 'minhas-solicitacoes', label: 'Minhas solicitacoes', icon: Receipt, path: '/solicitacoes' },
      { key: 'aprovacoes', label: 'Aprovacoes', icon: CheckCircle2, path: '/aprovacoes', requires: 'isAprovador' },
      { key: 'pagamentos', label: 'Contas a pagar', icon: Receipt, path: '/pagamentos', requires: 'isFinanceiro' },
    ],
  },
  { key: 'estoque', label: 'Estoque', icon: Package, path: '/estoque', comingSoon: true },
  { key: 'compras', label: 'Compras', icon: ShoppingCart, path: '/compras', comingSoon: true },
  { key: 'rh', label: 'RH', icon: UsersRound, path: '/rh', comingSoon: true },
];
