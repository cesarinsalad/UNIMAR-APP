import {
  chipEstado,
  esDevuelto,
  estadoCargaPortada,
  etiquetaAudiencia,
  visibleEnColaGestion,
} from './helpers';

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

describe('estadoCargaPortada', () => {
  it('con URL y sin fallo → imagen', () => {
    expect(
      estadoCargaPortada({ url: 'https://cdn/portada.jpg', cargando: false }),
    ).toBe('imagen');
  });

  it('sin URL mientras carga → skeleton', () => {
    expect(estadoCargaPortada({ url: undefined, cargando: true })).toBe('cargando');
  });

  it('sin URL y sin carga → placeholder (no hay portada)', () => {
    expect(estadoCargaPortada({ url: undefined, cargando: false })).toBe('vacia');
  });

  it('si la Image falló → placeholder aunque hubiera URL', () => {
    expect(
      estadoCargaPortada({
        url: 'https://cdn/portada.jpg',
        cargando: false,
        fallo: true,
      }),
    ).toBe('vacia');
  });

  it('refetch con URL cacheada nunca vuelve al skeleton', () => {
    expect(
      estadoCargaPortada({ url: 'https://cdn/portada.jpg', cargando: true }),
    ).toBe('imagen');
  });
});

describe('visibleEnColaGestion', () => {
  it('oculta un BORRADOR ajeno', () => {
    expect(visibleEnColaGestion({ estado: 'BORRADOR', autorId: 'otro' }, 'admin')).toBe(false);
    expect(visibleEnColaGestion({ estado: 'BORRADOR', autorId: 'otro' }, null)).toBe(false);
  });

  it('permite un BORRADOR propio', () => {
    expect(visibleEnColaGestion({ estado: 'BORRADOR', autorId: 'admin' }, 'admin')).toBe(true);
  });

  it('permite PENDIENTE, PUBLICADO y ARCHIVADO aunque sean de otro autor', () => {
    expect(visibleEnColaGestion({ estado: 'PENDIENTE', autorId: 'otro' }, 'admin')).toBe(true);
    expect(visibleEnColaGestion({ estado: 'PUBLICADO', autorId: 'otro' }, 'admin')).toBe(true);
    expect(visibleEnColaGestion({ estado: 'ARCHIVADO', autorId: 'otro' }, 'admin')).toBe(true);
  });
});