export function upsertByKey(list, item, keyFn) {
  if (!item) return list;

  const targetKey = keyFn(item);
  const exists = list.some((entry) => keyFn(entry) === targetKey);

  if (!exists) return [item, ...list];

  return list.map((entry) => (keyFn(entry) === targetKey ? { ...entry, ...item } : entry));
}
