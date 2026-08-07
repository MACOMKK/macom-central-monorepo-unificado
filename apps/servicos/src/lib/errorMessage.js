const TECHNICAL_PATTERNS = [
  { test: /duplicate key value violates unique constraint/i, message: 'Este registro ja existe.' },
  { test: /violates foreign key constraint/i, message: 'Este registro esta vinculado a outros dados e nao pode ser usado dessa forma.' },
  { test: /violates not-null constraint/i, message: 'Faltam informacoes obrigatorias para concluir a operacao.' },
  { test: /violates check constraint/i, message: 'Os dados informados nao sao validos.' },
  { test: /permission denied/i, message: 'Voce nao tem permissao para realizar esta acao.' },
  { test: /relation ".*" does not exist|column ".*" does not exist/i, message: 'Ocorreu um erro inesperado. Tente novamente.' },
  { test: /invalid input syntax/i, message: 'Os dados informados nao sao validos.' },
  { test: /failed to fetch|networkerror|network error|load failed/i, message: 'Falha de conexao. Verifique sua internet e tente novamente.' },
];

const FALLBACK_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente.';

export function getFriendlyErrorMessage(error, fallback = FALLBACK_MESSAGE) {
  const rawMessage = error?.message;
  if (!rawMessage) return fallback;

  const match = TECHNICAL_PATTERNS.find(({ test }) => test.test(rawMessage));
  if (match) return match.message;

  return rawMessage;
}
