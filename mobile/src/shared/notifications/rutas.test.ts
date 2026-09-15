import { rutaParaNotificacion } from './rutas';

describe('rutaParaNotificacion', () => {
  it.each([
    ['COMUNICADO_PUBLICADO', '/comunicados/abc-123'],
    ['COMUNICADO_RECHAZADO', '/comunicados/abc-123'],
    ['EVENTO_OFICIAL_CREADO', '/eventos/abc-123'],
    ['EVENTO_RECORDATORIO', '/eventos/abc-123'],
    ['NOTA_PUBLICADA', '/academico/materias/abc-123'],
  ])('%s → %s', (tipo, esperada) => {
    expect(rutaParaNotificacion(tipo, 'abc-123')).toBe(esperada);
  });

  it('tipo desconocido no navega', () => {
    expect(rutaParaNotificacion('TIPO_FANTASMA', 'abc-123')).toBeNull();
    expect(rutaParaNotificacion(undefined, 'abc-123')).toBeNull();
  });

  it('sin referencia_id no navega', () => {
    expect(rutaParaNotificacion('COMUNICADO_PUBLICADO', null)).toBeNull();
    expect(rutaParaNotificacion('NOTA_PUBLICADA', '')).toBeNull();
    expect(rutaParaNotificacion('NOTA_PUBLICADA', undefined)).toBeNull();
  });
});