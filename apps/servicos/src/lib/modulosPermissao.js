// Espelha os modulos operacionais de src/lib/navigation.js, mas so os que tem
// (ou vao ter) Camada 2 de permissao. `ativo: true` = modulo real, com coluna
// visivel/editavel na tela de Permissoes. Os demais aparecem cinza, so pra dar
// visibilidade do que vem a seguir; quando ganharem tela real, e so virar `true`
// aqui e no backend (SERVICOS_MODULOS em supabase/functions/servicos-api).
export const MODULOS_PERMISSAO = [
  { key: 'financeiro', label: 'Financeiro', ativo: true },
  { key: 'atendimento', label: 'Atendimento', ativo: false },
  { key: 'oficina', label: 'Oficina', ativo: false },
  { key: 'estoque', label: 'Estoque', ativo: false },
  { key: 'compras', label: 'Compras', ativo: false },
  { key: 'rh', label: 'RH', ativo: false },
];

export const PAPEIS_MODULO = [
  { value: 'usuario', label: 'Usuario' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'admin', label: 'Admin' },
  { value: 'nenhum', label: 'Sem acesso' },
];
