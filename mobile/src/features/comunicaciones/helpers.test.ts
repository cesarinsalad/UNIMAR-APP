import { chipEstado, etiquetaAudiencia } from './helpers';

describe('etiquetaAudiencia', () => {
  it('[] → GLOBAL ("Toda la universidad")', () => {
    expect(etiquetaAudiencia([])).toBe('Toda la universidad');
  });

  it('un decanato → singular', () => {
    expect(etiquetaAudiencia([5])).toBe('Decanato 5');
  });

  it('varios decanatos → plural con comas', () => {
    expect(etiquetaAudiencia([3, 5])).toBe('Decanatos 3, 5');
  });
});

describe('chipEstado', () => {
  it.each([
    ['BORRADOR', 'Borrador'],
    ['PENDIENTE', 'Pendiente de aprobación'],
    ['ARCHIVADO', 'Archivado'],
  ] as const)('%s → chip de estado', (estado, etiqueta) => {
    expect(chipEstado(estado)).toBe(etiqueta);
  });

  it('PUBLICADO → sin chip (regla de diseño del 3b)', () => {
    expect(chipEstado('PUBLICADO')).toBeNull();
  });
});