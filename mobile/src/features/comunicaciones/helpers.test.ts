import { chipEstado, esDevuelto, etiquetaAudiencia } from './helpers';

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
    ['PENDIENTE', 'En revisión'],
    ['ARCHIVADO', 'Archivado'],
  ] as const)('%s → chip de estado', (estado, etiqueta) => {
    expect(chipEstado(estado)).toBe(etiqueta);
  });

  it('PUBLICADO → sin chip (regla de diseño del 3b)', () => {
    expect(chipEstado('PUBLICADO')).toBeNull();
  });
});

describe('esDevuelto', () => {
  it('BORRADOR con motivoRechazo → devuelto', () => {
    expect(esDevuelto({ estado: 'BORRADOR', motivoRechazo: 'completa el link' })).toBe(true);
  });

  it('BORRADOR sin motivo → borrador común, no devuelto', () => {
    expect(esDevuelto({ estado: 'BORRADOR', motivoRechazo: null })).toBe(false);
  });

  it('PENDIENTE/PUBLICADO/ARCHIVADO nunca son devueltos aunque tuvieran motivo', () => {
    expect(esDevuelto({ estado: 'PENDIENTE', motivoRechazo: 'viejo' })).toBe(false);
    expect(esDevuelto({ estado: 'PUBLICADO', motivoRechazo: 'viejo' })).toBe(false);
    expect(esDevuelto({ estado: 'ARCHIVADO', motivoRechazo: 'viejo' })).toBe(false);
  });
});