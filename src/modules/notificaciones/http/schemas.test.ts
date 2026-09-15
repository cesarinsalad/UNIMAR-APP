// Tests del esquema del query de la bandeja (capa HTTP pura, sin DB ni red).
//
// Regresión del bug de z.coerce.boolean(): Boolean('false') evalúa true,
// así que ?solo_no_leidas=false filtraba por no leídas en lugar de listar
// todo. Ahora el param es un enum estricto con transform a boolean.

import { describe, expect, it } from 'vitest';

import { listarNotificacionesQuerySchema } from './schemas';

const base = { limit: '20', offset: '0' };

describe('listarNotificacionesQuerySchema.solo_no_leidas', () => {
  it("'true' → true", () => {
    const result = listarNotificacionesQuerySchema.parse({
      ...base,
      solo_no_leidas: 'true',
    });
    expect(result.solo_no_leidas).toBe(true);
  });

  it("'false' → false (regresión del bug de coerce boolean)", () => {
    const result = listarNotificacionesQuerySchema.parse({
      ...base,
      solo_no_leidas: 'false',
    });
    expect(result.solo_no_leidas).toBe(false);
  });

  it('omitido → false (default)', () => {
    const result = listarNotificacionesQuerySchema.parse(base);
    expect(result.solo_no_leidas).toBe(false);
  });

  it.each(['', 'maybe', '1', '0', 'True'])(
    "solo_no_leidas='%s' → BAD_REQUEST (garbage estring)",
    (valor) => {
      expect(() =>
        listarNotificacionesQuerySchema.parse({ ...base, solo_no_leidas: valor }),
      ).toThrow();
    },
  );
});

describe('listarNotificacionesQuerySchema.paginación', () => {
  it('defaults: limit 20, offset 0', () => {
    const result = listarNotificacionesQuerySchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
    expect(result.solo_no_leidas).toBe(false);
  });

  it('limit/offset numéricos coercenan desde string', () => {
    const result = listarNotificacionesQuerySchema.parse({ limit: '50', offset: '10' });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(10);
  });

  it.each([
    { limit: '0', offset: '0' }, // limit < 1
    { limit: '101', offset: '0' }, // limit > 100
    { limit: '20', offset: '-1' }, // offset negativo
    { limit: '20.5', offset: '0' }, // no entero
  ])('$jso → BAD_REQUEST', (query) => {
    expect(() => listarNotificacionesQuerySchema.parse(query)).toThrow();
  });
});