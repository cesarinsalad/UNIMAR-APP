import { accionesPermitidas } from './accionesPermitidas';

function contexto(rol: 'ESTUDIANTE' | 'COMUNICADOR' | 'ADMIN' | null, esAutor: boolean) {
  return { rol, esAutor };
}

const sinAcciones = {
  puedeEditar: false,
  puedeSolicitarRevision: false,
  puedeAprobar: false,
  puedeRechazar: false,
  puedePublicar: false,
  puedeArchivar: false,
  puedeDesarchivar: false,
};

describe('accionesPermitidas', () => {
  it('sin sesión → nada', () => {
    expect(accionesPermitidas({ ...contexto(null, false), estado: 'BORRADOR' })).toEqual(sinAcciones);
  });

  it('ESTUDIANTE nunca ve acciones (aunque sea del staff ajeno)', () => {
    const todas: Array<'BORRADOR' | 'PENDIENTE' | 'PUBLICADO' | 'ARCHIVADO'> = [
      'BORRADOR',
      'PENDIENTE',
      'PUBLICADO',
      'ARCHIVADO',
    ];
    for (const estado of todas) {
      expect(accionesPermitidas({ ...contexto('ESTUDIANTE', false), estado })).toEqual(sinAcciones);
    }
  });

  it('COMUNICADOR autor en BORRADOR → editar, solicitar revisión y archivar NO aplican', () => {
    const r = accionesPermitidas({
      ...contexto('COMUNICADOR', true),
      estado: 'BORRADOR',
    });
    expect(r.puedeEditar).toBe(true);
    expect(r.puedeSolicitarRevision).toBe(true);
    expect(r.puedeArchivar).toBe(false);
    expect(r.puedeAprobar).toBe(false);
    expect(r.puedeRechazar).toBe(false);
    expect(r.puedePublicar).toBe(false);
    expect(r.puedeDesarchivar).toBe(false);
  });

  it('COMUNICADOR ajeno → nada (ni siquiera PUBLICADO)', () => {
    for (const estado of ['PENDIENTE', 'PUBLICADO'] as const) {
      expect(accionesPermitidas({ ...contexto('COMUNICADOR', false), estado })).toEqual(sinAcciones);
    }
  });

  it('COMUNICADOR autor en PUBLICADO → editar y archivar', () => {
    const r = accionesPermitidas({
      ...contexto('COMUNICADOR', true),
      estado: 'PUBLICADO',
    });
    expect(r.puedeEditar).toBe(true);
    expect(r.puedeArchivar).toBe(true);
    expect(r.puedeSolicitarRevision).toBe(false);
  });

  it('ADMIN en PENDIENTE ajeno → aprobar y rechazar', () => {
    const r = accionesPermitidas({
      ...contexto('ADMIN', false),
      estado: 'PENDIENTE',
    });
    expect(r.puedeAprobar).toBe(true);
    expect(r.puedeRechazar).toBe(true);
    expect(r.puedePublicar).toBe(false);
    expect(r.puedeSolicitarRevision).toBe(false);
  });

  it('ADMIN en BORRADOR ajeno → editar y publicar directo, sin rechazar', () => {
    const r = accionesPermitidas({
      ...contexto('ADMIN', false),
      estado: 'BORRADOR',
    });
    expect(r.puedeEditar).toBe(true);
    expect(r.puedePublicar).toBe(true);
    expect(r.puedeAprobar).toBe(false);
    expect(r.puedeRechazar).toBe(false);
  });

  it('ADMIN en ARCHIVADO → solo desarchivar (el único camino de salida)', () => {
    const r = accionesPermitidas({ ...contexto('ADMIN', false), estado: 'ARCHIVADO' });
    expect(r).toEqual({
      puedeEditar: false,
      puedeSolicitarRevision: false,
      puedeAprobar: false,
      puedeRechazar: false,
      puedePublicar: false,
      puedeArchivar: false,
      puedeDesarchivar: true,
    });
  });

  it('COMUNICADOR autor desarchiva su ARCHIVADO; ajeno no', () => {
    expect(
      accionesPermitidas({ ...contexto('COMUNICADOR', true), estado: 'ARCHIVADO' }).puedeDesarchivar,
    ).toBe(true);
    expect(
      accionesPermitidas({ ...contexto('COMUNICADOR', false), estado: 'ARCHIVADO' }).puedeDesarchivar,
    ).toBe(false);
  });
});
