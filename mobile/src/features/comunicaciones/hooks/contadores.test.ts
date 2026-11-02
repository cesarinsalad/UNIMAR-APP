import { etiquetaConteo } from './contadores';

describe('etiquetaConteo', () => {
  const CAP = 20;

  it('conteos bajo el cap se muestran exactos', () => {
    expect(etiquetaConteo(0, CAP)).toBe('0');
    expect(etiquetaConteo(1, CAP)).toBe('1');
    expect(etiquetaConteo(19, CAP)).toBe('19');
  });

  it('página llena = cota superior con sufijo +', () => {
    expect(etiquetaConteo(20, CAP)).toBe('20+');
    expect(etiquetaConteo(21, CAP)).toBe('20+');
    expect(etiquetaConteo(100, CAP)).toBe('20+');
  });
});
