import { accionesPermitidasEvento } from './eventos-permisos';

describe('accionesPermitidasEvento', () => {
  const sinAcciones = { puedeEditar: false, puedeEliminar: false };

  it('sin sesión → nada', () => {
    expect(accionesPermitidasEvento({ rol: null, esDueno: true, tipo: 'PERSONAL' })).toEqual(sinAcciones);
  });

  it('PERSONAL ajeno (cualquier rol) → nada', () => {
    expect(accionesPermitidasEvento({ rol: 'ESTUDIANTE', esDueno: false, tipo: 'PERSONAL' })).toEqual(sinAcciones);
    expect(accionesPermitidasEvento({ rol: 'ADMIN', esDueno: false, tipo: 'PERSONAL' })).toEqual(sinAcciones);
  });

  it('PERSONAL de un ESTUDIANTE dueño → edita y elimina', () => {
    expect(accionesPermitidasEvento({ rol: 'ESTUDIANTE', esDueno: true, tipo: 'PERSONAL' })).toEqual({
      puedeEditar: true,
      puedeEliminar: true,
    });
  });

  it('OFICIAL: ADMIN ajeno → todo', () => {
    expect(accionesPermitidasEvento({ rol: 'ADMIN', esDueno: false, tipo: 'OFICIAL' })).toEqual({
      puedeEditar: true,
      puedeEliminar: true,
    });
  });

  it('OFICIAL: COMUNICADOR ajeno → nada', () => {
    expect(accionesPermitidasEvento({ rol: 'COMUNICADOR', esDueno: false, tipo: 'OFICIAL' })).toEqual(sinAcciones);
  });

  it('OFICIAL: COMUNICADOR dueño → todo', () => {
    expect(accionesPermitidasEvento({ rol: 'COMUNICADOR', esDueno: true, tipo: 'OFICIAL' })).toEqual({
      puedeEditar: true,
      puedeEliminar: true,
    });
  });

  it('OFICIAL: ESTUDIANTE (dueño o no, imposible por contrato) → nada', () => {
    expect(accionesPermitidasEvento({ rol: 'ESTUDIANTE', esDueno: true, tipo: 'OFICIAL' })).toEqual(sinAcciones);
  });
});