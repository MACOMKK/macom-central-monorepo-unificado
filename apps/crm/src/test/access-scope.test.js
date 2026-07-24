import { describe, expect, it } from 'vitest';
import { buildAccessScope, getAccessLevel } from '../../../../supabase/functions/crm-api/access-scope.ts';

const collaborator = { id: 'colab-1', unidade_id: 'unidade-1' };

describe('getAccessLevel', () => {
  it('reads nivel_acesso from the access record', () => {
    expect(getAccessLevel({ nivel_acesso: 'admin' })).toBe('admin');
  });

  it('returns an empty string when access is null', () => {
    expect(getAccessLevel(null)).toBe('');
  });
});

describe('buildAccessScope', () => {
  it('admin gets no scoping clause on any entity', () => {
    for (const entity of ['leads', 'clientes', 'atendimentos', 'historico_atendimentos', 'veiculos_interesse']) {
      const scope = buildAccessScope(entity, { nivel_acesso: 'admin' }, collaborator, 2);
      expect(scope).toEqual({ clause: '', values: [] });
    }
  });

  it('gestor scopes leads and atendimentos by unidade_id', () => {
    const access = { nivel_acesso: 'gestor' };
    expect(buildAccessScope('leads', access, collaborator, 2)).toEqual({
      clause: 'l."unidade_id" = $2',
      values: ['unidade-1'],
    });
    expect(buildAccessScope('atendimentos', access, collaborator, 2)).toEqual({
      clause: 'l."unidade_id" = $2',
      values: ['unidade-1'],
    });
  });

  it('gestor without unidade_id throws a 403', () => {
    const access = { nivel_acesso: 'gestor' };
    expect(() => buildAccessScope('leads', access, { id: 'colab-1' }, 2))
      .toThrowError(expect.objectContaining({ message: 'Gestor sem unidade vinculada.', status: 403 }));
  });

  it('usuario scopes leads by responsavel_id or criado_por', () => {
    const access = { nivel_acesso: 'usuario' };
    expect(buildAccessScope('leads', access, collaborator, 3)).toEqual({
      clause: '(l."responsavel_id" = $3 or l."criado_por" = $3)',
      values: ['colab-1'],
    });
  });

  it('missing collaborator id throws a 403 regardless of level', () => {
    const access = { nivel_acesso: 'usuario' };
    expect(() => buildAccessScope('leads', access, {}, 2))
      .toThrowError(expect.objectContaining({ message: 'Colaborador nao identificado.', status: 403 }));
  });

  it('unknown entity falls through to an unscoped clause', () => {
    const access = { nivel_acesso: 'usuario' };
    expect(buildAccessScope('unknown_entity', access, collaborator, 2)).toEqual({ clause: '', values: [] });
  });
});
