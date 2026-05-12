export function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function hasExactDigits(value, length) {
  return normalizeDigits(value).length === length;
}
