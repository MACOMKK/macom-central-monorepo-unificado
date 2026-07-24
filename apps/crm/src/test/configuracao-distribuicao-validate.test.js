import { describe, expect, it } from 'vitest';
import { validateDraft } from '@/pages/ConfiguracaoDistribuicao';

function baseDraft(overrides = {}) {
  return {
    limite_padrao_leads_ativos: '',
    sla_primeiro_contato_minutos: 30,
    sla_alerta_minutos: 10,
    sellers: [],
    ...overrides,
  };
}

describe('validateDraft', () => {
  it('accepts a valid draft with no seller limits', () => {
    expect(validateDraft(baseDraft())).toBeNull();
  });

  it('accepts an explicit positive integer limite_padrao_leads_ativos', () => {
    expect(validateDraft(baseDraft({ limite_padrao_leads_ativos: '5' }))).toBeNull();
  });

  it('rejects a non-integer limite_padrao_leads_ativos', () => {
    expect(validateDraft(baseDraft({ limite_padrao_leads_ativos: '0' })))
      .toMatch(/Limite padrao por vendedor/);
    expect(validateDraft(baseDraft({ limite_padrao_leads_ativos: '-1' })))
      .toMatch(/Limite padrao por vendedor/);
    expect(validateDraft(baseDraft({ limite_padrao_leads_ativos: 'abc' })))
      .toMatch(/Limite padrao por vendedor/);
  });

  it('requires sla_primeiro_contato_minutos to be a positive integer', () => {
    expect(validateDraft(baseDraft({ sla_primeiro_contato_minutos: '' })))
      .toMatch(/SLA do primeiro contato/);
    expect(validateDraft(baseDraft({ sla_primeiro_contato_minutos: 0 })))
      .toMatch(/SLA do primeiro contato/);
  });

  it('requires sla_alerta_minutos to be a non-negative integer', () => {
    expect(validateDraft(baseDraft({ sla_alerta_minutos: '' })))
      .toMatch(/Alerta antes de vencer/);
    expect(validateDraft(baseDraft({ sla_alerta_minutos: -1 })))
      .toMatch(/Alerta antes de vencer/);
    expect(validateDraft(baseDraft({ sla_alerta_minutos: 0 }))).toBeNull();
  });

  it('rejects an invalid individual seller limit', () => {
    const draft = baseDraft({ sellers: [{ colaborador_id: 's1', limite_leads_ativos: '0' }] });
    expect(validateDraft(draft)).toMatch(/Limite individual do vendedor/);
  });

  it('accepts a blank individual seller limit (uses default)', () => {
    const draft = baseDraft({ sellers: [{ colaborador_id: 's1', limite_leads_ativos: '' }] });
    expect(validateDraft(draft)).toBeNull();
  });
});
