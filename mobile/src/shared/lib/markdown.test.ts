import { describe, expect, it } from '@jest/globals';

import { excerpt } from './markdown';

describe('excerpt', () => {
  it('primer párrafo no vacío', () => {
    expect(excerpt('En doble línea.\n\nY luego.')).toBe('En doble línea.');
  });

  it('despoja sintaxis: heading, bold, link, imagen, lista, quote', () => {
    const md = '## Apren de inscripción\n**Conoce** los [requisitos](https://x.ve) ![1](x.png)';
    expect(excerpt(md)).toBe('Apren de inscripción Conoce los requisitos 1');
  });

  it('truncado con lead (max 160 + …)', () => {
    const largo = 'a'.repeat(200);
    const r = excerpt(largo);
    expect(r.startsWith('a'.repeat(160))).toBe(true);
    expect(r.endsWith('…')).toBe(true);
  });
});
