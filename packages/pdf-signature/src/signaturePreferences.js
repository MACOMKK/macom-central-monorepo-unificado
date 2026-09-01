// Lembra, por usuario e por "namespace" (um por app/fluxo que usa assinatura em PDF), a ultima
// posicao/pagina escolhida para carimbar a assinatura, em localStorage. pageIndex e resolvido de
// forma semantica (first/last/absolute) para sobreviver a PDFs com numero de paginas diferente
// entre geracoes (ex.: sempre "ultima pagina").
function buildKey(namespace, userId) {
  return `macom:${namespace}:assinatura-pdf:${userId}`;
}

export function createLocalSignaturePreferenceStore(namespace) {
  return {
    load(userId, totalPaginas) {
      if (!userId) return null;

      let raw = null;
      try {
        raw = localStorage.getItem(buildKey(namespace, userId));
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
    },

    save(userId, { pageIndex, totalPaginas, xFrac, yFrac, widthFrac, heightFrac }) {
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
        localStorage.setItem(buildKey(namespace, userId), JSON.stringify(payload));
      } catch {
        // localStorage indisponivel (modo privado, cota) — preferencia simplesmente nao e lembrada.
      }
    },
  };
}
