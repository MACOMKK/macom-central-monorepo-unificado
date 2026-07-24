export function companyFromUnit(unitName = '') {
  const normalized = unitName.toLowerCase();
  if (normalized.includes('paragominas')) return 'Macom Paragominas';
  if (normalized.includes('bel')) return 'Macom Belém';
  return 'Macom Ananindeua';
}
