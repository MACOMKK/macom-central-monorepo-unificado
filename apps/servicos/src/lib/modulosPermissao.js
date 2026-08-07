// Espelha os modulos operacionais de src/lib/navigation.js, mas so os que tem
// (ou vao ter) Camada 2 de permissao. `ativo: true` = modulo real, com coluna
// visivel/editavel na tela de Permissoes. Os demais aparecem cinza, so pra dar
// visibilidade do que vem a seguir; quando ganharem tela real, e so virar `true`
// aqui e no backend (SERVICOS_MODULOS_CONFIG em supabase/functions/servicos-api).
//
// Cada modulo ativo declara seu proprio `papeis` (nao um enum global): o
// Financeiro usa nomes especificos do proprio fluxo de aprovacao (usuario = solicita,
// aprovador = aprova/reprova, financeiro = tambem marca como pago), mas um modulo
// futuro sem fluxo de aprovacao pode preferir algo mais simples (ex. visualizar/editar).
// Se um modulo novo precisar de um papel que ainda nao existe, alargar o CHECK de
// gestao_servicos.permissoes_modulo.papel via migration e manter esse array em
// sincronia com `papeis` do backend (SERVICOS_MODULOS_CONFIG).
export const PAPEIS_MODULO_FINANCEIRO = [
  { value: 'usuario', label: 'Usuario' },
  { value: 'aprovador', label: 'Aprovador' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'nenhum', label: 'Sem acesso' },
];

export const MODULOS_PERMISSAO = [
  { key: 'financeiro', label: 'Financeiro', ativo: true, papeis: PAPEIS_MODULO_FINANCEIRO },
  { key: 'atendimento', label: 'Atendimento', ativo: false },
  { key: 'oficina', label: 'Oficina', ativo: false },
  { key: 'estoque', label: 'Estoque', ativo: false },
  { key: 'compras', label: 'Compras', ativo: false },
  { key: 'rh', label: 'RH', ativo: false },
];
