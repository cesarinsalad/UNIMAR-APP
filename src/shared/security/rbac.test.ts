import { describe, expect, it } from 'vitest';
import { hasRole, roleRank } from './rbac';

describe('rbac', () => {
  describe('hasRole', () => {
    it('admite el mismo rol', () => {
      expect(hasRole('ESTUDIANTE', 'ESTUDIANTE')).toBe(true);
    });

    it('respeta la jerarquía ascendente', () => {
      expect(hasRole('COMUNICADOR', 'ESTUDIANTE')).toBe(true);
      expect(hasRole('ADMIN', 'COMUNICADOR')).toBe(true);
      expect(hasRole('ADMIN', 'ESTUDIANTE')).toBe(true);
    });

    it('rechaza jerarquía descendente', () => {
      expect(hasRole('ESTUDIANTE', 'COMUNICADOR')).toBe(false);
      expect(hasRole('ESTUDIANTE', 'ADMIN')).toBe(false);
      expect(hasRole('COMUNICADOR', 'ADMIN')).toBe(false);
    });

    it('rechaza roles desconocidos', () => {
      expect(hasRole('NO_EXISTE', 'ESTUDIANTE')).toBe(false);
      expect(roleRank('NO_EXISTE')).toBe(-1);
    });
  });
});
