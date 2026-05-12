export function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function levenshteinDistance(source, target) {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = source[row - 1] === target[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[source.length][target.length];
}

export function resolveIdByName(rawValue, options) {
  const normalizedInput = normalizeText(rawValue);
  if (!normalizedInput) return null;

  const exactMatch = options.find((option) => option.normalized === normalizedInput);
  if (exactMatch) return exactMatch.id;

  let bestMatch = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const option of options) {
    const distance = levenshteinDistance(normalizedInput, option.normalized);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = option;
    }
  }

  const maxDistance = normalizedInput.length <= 6 ? 1 : 2;
  return bestDistance <= maxDistance ? bestMatch?.id || null : null;
}
