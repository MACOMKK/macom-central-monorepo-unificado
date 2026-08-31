function buildKey(userId) {
  return `macom:servicos:assinatura-pdf:${userId}`;
}

export function loadAssinaturaPreference(userId, totalPaginas) {
  if (!userId) return null;

  let raw = null;
  try {
    raw = localStorage.getItem(buildKey(userId));
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const { pagePreference, pageIndexAbsolute, xFrac, yFrac, widthFrac, heightFrac } = parsed || {};
  if (
    typeof xFrac !== 'number' ||
    typeof yFrac !== 'number' ||
    typeof widthFrac !== 'number' ||
    typeof heightFrac !== 'number'
  ) {
    return null;
  }

  let pageIndex;
  if (pagePreference === 'first') {
    pageIndex = 0;
  } else if (pagePreference === 'absolute' && typeof pageIndexAbsolute === 'number') {
    pageIndex = Math.min(pageIndexAbsolute, totalPaginas - 1);
  } else {
    pageIndex = totalPaginas - 1;
  }
  pageIndex = Math.max(0, pageIndex);

  return { pageIndex, xFrac, yFrac, widthFrac, heightFrac };
}

export function saveAssinaturaPreference(userId, { pageIndex, totalPaginas, xFrac, yFrac, widthFrac, heightFrac }) {
  if (!userId) return;

  let pagePreference = 'absolute';
  if (pageIndex === totalPaginas - 1) pagePreference = 'last';
  else if (pageIndex === 0) pagePreference = 'first';

  const payload = {
    pagePreference,
    pageIndexAbsolute: pagePreference === 'absolute' ? pageIndex : null,
    xFrac,
    yFrac,
    widthFrac,
    heightFrac,
  };

  try {
    localStorage.setItem(buildKey(userId), JSON.stringify(payload));
  } catch {
    // localStorage indisponível (modo privado, cota) — preferência simplesmente não é lembrada.
  }
}
