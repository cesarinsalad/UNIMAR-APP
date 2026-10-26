// Tests puros del ranking del carrusel de noticias (sin React).
import { seleccionarParaCarrusel } from './carrusel';
import type { Comunicado } from './types';

function makeComunicado(overrides: Partial<Comunicado> = {}): Comunicado {
  return {
    id: 'id-1',
    titulo: 'Noticia',
    cuerpo: 'cuerpo',
    autorId: 'autor',
    estado: 'PUBLICADO',
    aprobadoPor: null,
    motivoRechazo: null,
    publicadoAt: '2026-10-01T12:00:00Z',
    programadoPara: null,
    expiraAt: null,
    imagenPath: null,
    imagenPie: null,
    categoria: null,
    autorNombre: 'Autor',
    createdAt: '2026-10-01T12:00:00Z',
    updatedAt: '2026-10-01T12:00:00Z',
    decanatoIds: [],
    ...overrides,
  };
}

describe('seleccionarParaCarrusel', () => {
  it('prioriza comunicados del decanato del usuario sobre globales', () => {
    const global = makeComunicado({ id: 'global', decanatoIds: [], imagenPath: 'x.png' });
    const mio = makeComunicado({ id: 'mio', decanatoIds: [5] });
    const resultado = seleccionarParaCarrusel([global, mio], 5);
    expect(resultado[0]?.id).toBe('mio');
  });

  it('empate de decanato: con portada antes que sin portada', () => {
    const conPortada = makeComunicado({ id: 'con', imagenPath: 'a.png', decanatoIds: [3] });
    const sinPortada = makeComunicado({ id: 'sin', decanatoIds: [3] });
    const resultado = seleccionarParaCarrusel([sinPortada, conPortada], 5);
    expect(resultado[0]?.id).toBe('con');
  });

  it('sin portadas ni decanato: el más reciente primero (publicadoAt)', () => {
    const viejo = makeComunicado({ id: 'viejo', publicadoAt: '2026-09-01T12:00:00Z' });
    const nuevo = makeComunicado({ id: 'nuevo', publicadoAt: '2026-10-20T12:00:00Z' });
    const resultado = seleccionarParaCarrusel([viejo, nuevo], null);
    expect(resultado[0]?.id).toBe('nuevo');
  });

  it('sin publicadoAt: usa createdAt como respaldo', () => {
    const viejo = makeComunicado({
      id: 'viejo',
      publicadoAt: null,
      createdAt: '2026-09-01T12:00:00Z',
    });
    const nuevo = makeComunicado({
      id: 'nuevo',
      publicadoAt: null,
      createdAt: '2026-10-20T12:00:00Z',
    });
    const resultado = seleccionarParaCarrusel([viejo, nuevo], null);
    expect(resultado[0]?.id).toBe('nuevo');
  });

  it('acota al máximo pedido', () => {
    const diez = Array.from({ length: 10 }, (_, i) =>
      makeComunicado({ id: `n-${i}`, createdAt: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z` }),
    );
    const resultado = seleccionarParaCarrusel(diez, 5, 3);
    expect(resultado).toHaveLength(3);
  });

  it('listas vacías devuelven vacío', () => {
    expect(seleccionarParaCarrusel([], 5)).toEqual([]);
  });
});
