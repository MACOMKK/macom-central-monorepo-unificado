import { describe, expect, it } from 'vitest';
import { companyFromUnit } from '@/lib/empresa';

describe('companyFromUnit', () => {
  it('matches Paragominas units', () => {
    expect(companyFromUnit('Macom Paragominas')).toBe('Macom Paragominas');
  });

  it('matches Belem units regardless of accent/case', () => {
    expect(companyFromUnit('MACOM BELEM')).toBe('Macom Belém');
    expect(companyFromUnit('macom belém')).toBe('Macom Belém');
  });

  it('defaults to Ananindeua for anything else', () => {
    expect(companyFromUnit('Matriz')).toBe('Macom Ananindeua');
    expect(companyFromUnit('')).toBe('Macom Ananindeua');
    expect(companyFromUnit(undefined)).toBe('Macom Ananindeua');
  });
});
