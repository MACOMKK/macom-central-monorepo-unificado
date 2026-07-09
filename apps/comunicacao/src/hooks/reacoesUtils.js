export function recomputeReacoes(reacoesAtuais, { emoji, colaboradorId, currentUserId, action }) {
  const atual = Array.isArray(reacoesAtuais) ? reacoesAtuais : [];
  const isOwn = colaboradorId === currentUserId;
  const index = atual.findIndex((item) => item.emoji === emoji);
  const existing = index >= 0 ? atual[index] : null;

  if (action === 'added') {
    if (isOwn && existing?.reagiu) return atual;
    if (existing) {
      const next = [...atual];
      next[index] = { ...existing, total: existing.total + 1, reagiu: existing.reagiu || isOwn };
      return next;
    }
    return [...atual, { emoji, total: 1, reagiu: isOwn }];
  }

  if (isOwn && !existing?.reagiu) return atual;
  if (!existing) return atual;
  const nextTotal = existing.total - 1;
  if (nextTotal <= 0) {
    return atual.filter((_, i) => i !== index);
  }
  const next = [...atual];
  next[index] = { ...existing, total: nextTotal, reagiu: isOwn ? false : existing.reagiu };
  return next;
}

export function updateMensagemReacoes(rows, mensagemId, options) {
  if (!Array.isArray(rows)) return rows;
  let found = false;
  const nextRows = rows.map((item) => {
    if (item.id !== mensagemId) return item;
    found = true;
    return { ...item, reacoes: recomputeReacoes(item.reacoes, options) };
  });
  return found ? nextRows : rows;
}
