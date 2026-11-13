import { evaluarAccesoWeb, rutaPermitidaStaffWeb } from './accesoWeb';

describe('rutaPermitidaStaffWeb', () => {
  it('la consola y sus deep-links pasan', () => {
    expect(rutaPermitidaStaffWeb('/gestion')).toBe(true);
    expect(rutaPermitidaStaffWeb('/gestion?seccion=colas&estado=PENDIENTE')).toBe(true);
    expect(rutaPermitidaStaffWeb('/gestion/eventos')).toBe(true);
    expect(rutaPermitidaStaffWeb('/gestion/comunicados')).toBe(true);
  });

  it('la bandeja de notificaciones pasa para staff', () => {
    expect(rutaPermitidaStaffWeb('/notificaciones')).toBe(true);
  });

  it('el flujo editorial pasa: editores y detalles por uuid', () => {
    expect(rutaPermitidaStaffWeb('/comunicados/nuevo')).toBe(true);
    expect(rutaPermitidaStaffWeb('/comunicados/nuevo?id=abc')).toBe(true);
    expect(rutaPermitidaStaffWeb('/eventos/nuevo')).toBe(true);
    expect(
      rutaPermitidaStaffWeb('/comunicados/100828bd-91ef-43da-8008-e27e8996f7e7'),
    ).toBe(true);
    expect(
      rutaPermitidaStaffWeb('/eventos/155cd524-0160-4f14-90f6-cabe1ea9757b'),
    ).toBe(true);
  });

  it('segmentos no-uuid y el resto del app rebota', () => {
    expect(rutaPermitidaStaffWeb('/comunicados/mis')).toBe(false);
    expect(rutaPermitidaStaffWeb('/comunicados/listado')).toBe(false);
    expect(rutaPermitidaStaffWeb('/eventos/listado')).toBe(false);
    expect(rutaPermitidaStaffWeb('/')).toBe(false);
    expect(rutaPermitidaStaffWeb('/academico/pensum')).toBe(false);
    expect(rutaPermitidaStaffWeb('/')).toBe(false);
  });

  it('uuid inválido (p. ej. subruta inventada) rebota', () => {
    expect(rutaPermitidaStaffWeb('/comunicados/titulo-nota')).toBe(false);
    expect(rutaPermitidaStaffWeb('/comunicados/123')).toBe(false);
  });
});

describe('evaluarAccesoWeb', () => {
  it('login siempre pasa', () => {
    expect(evaluarAccesoWeb('/login', null)).toBe('pasar');
    expect(evaluarAccesoWeb('/login', 'ESTUDIANTE')).toBe('pasar');
    expect(evaluarAccesoWeb('/login', 'ADMIN')).toBe('pasar');
  });

  it('sin sesión: pasa (el guard de token del (app) decide → /login)', () => {
    expect(evaluarAccesoWeb('/', null)).toBe('pasar');
    expect(evaluarAccesoWeb('/gestion', null)).toBe('pasar');
  });

  it('estudiante autenticado en web: bloquear (screen "solo móvil")', () => {
    expect(evaluarAccesoWeb('/', 'ESTUDIANTE')).toBe('bloquear');
    expect(evaluarAccesoWeb('/comunicados', 'ESTUDIANTE')).toBe('bloquear');
    expect(evaluarAccesoWeb('/gestion', 'ESTUDIANTE')).toBe('bloquear');
  });

  it('staff: fuera de gestión/notificaciones → irGestion (también desde /)', () => {
    expect(evaluarAccesoWeb('/', 'ADMIN')).toBe('irGestion');
    expect(evaluarAccesoWeb('/academico/pensum', 'ADMIN')).toBe('irGestion');
  });

  it('staff: consola, flujo editorial y notificaciones pasan', () => {
    expect(evaluarAccesoWeb('/gestion', 'COMUNICADOR')).toBe('pasar');
    expect(evaluarAccesoWeb('/gestion?seccion=eventos', 'ADMIN')).toBe('pasar');
    expect(evaluarAccesoWeb('/notificaciones', 'COMUNICADOR')).toBe('pasar');
    expect(evaluarAccesoWeb('/comunicados/nuevo', 'COMUNICADOR')).toBe('pasar');
    expect(
      evaluarAccesoWeb(
        '/comunicados/100828bd-91ef-43da-8008-e27e8996f7e7',
        'ADMIN',
      ),
    ).toBe('pasar');
  });
});
