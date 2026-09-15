import {
  guardarRutaPendiente,
  limpiarRutaPendiente,
  tomarRutaPendiente,
} from './pendingLink';

beforeEach(() => {
  limpiarRutaPendiente();
});

describe('cola de ruta pendiente', () => {
  it('guardar → tomar consume y devuelve la ruta', () => {
    guardarRutaPendiente('/comunicados/abc');
    expect(tomarRutaPendiente()).toBe('/comunicados/abc');
  });

  it('tomar sin pendiente devuelve null', () => {
    expect(tomarRutaPendiente()).toBeNull();
  });

  it('se puede tomar una sola vez (get-and-clear)', () => {
    guardarRutaPendiente('/eventos/x');
    expect(tomarRutaPendiente()).toBe('/eventos/x');
    expect(tomarRutaPendiente()).toBeNull();
  });

  it('la última ruta guardada gana', () => {
    guardarRutaPendiente('/comunicados/a');
    guardarRutaPendiente('/comunicados/b');
    expect(tomarRutaPendiente()).toBe('/comunicados/b');
  });

  it('limpiarRutaPendiente borra lo pendiente', () => {
    guardarRutaPendiente('/comunicados/a');
    limpiarRutaPendiente();
    expect(tomarRutaPendiente()).toBeNull();
  });
});