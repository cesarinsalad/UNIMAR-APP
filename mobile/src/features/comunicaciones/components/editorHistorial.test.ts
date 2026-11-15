import {
  crearHistorial,
  deshacerHistorial,
  entradaActual,
  puedeDeshacer,
  puedeRehacer,
  registrarEnHistorial,
  rehacerHistorial,
} from './editorHistorial';

const SEL = { start: 0, end: 0 };

describe('editorHistorial', () => {
  it('agrupa escritura continua en una sola entrada', () => {
    let estado = crearHistorial('', SEL, 0);
    estado = registrarEnHistorial(estado, 'H', SEL, 'texto', 100);
    estado = registrarEnHistorial(estado, 'Ho', SEL, 'texto', 300);
    estado = registrarEnHistorial(estado, 'Hol', SEL, 'texto', 500);
    expect(estado.entradas).toHaveLength(2);
    expect(entradaActual(estado).markdown).toBe('Hol');
  });

  it('una pausa separa entradas de escritura', () => {
    let estado = crearHistorial('', SEL, 0);
    estado = registrarEnHistorial(estado, 'Hola', SEL, 'texto', 100);
    estado = registrarEnHistorial(estado, 'Hola mundo', SEL, 'texto', 1200);
    expect(estado.entradas).toHaveLength(3);
  });

  it('un formato separa la transacción y deshacer recupera el texto previo', () => {
    let estado = crearHistorial('Hola', SEL, 0);
    estado = registrarEnHistorial(estado, '**Hola**', SEL, 'formato', 100);
    const movimiento = deshacerHistorial(estado);
    expect(movimiento?.entrada.markdown).toBe('Hola');
    expect(puedeRehacer(movimiento!.estado)).toBe(true);
  });

  it('deshacer y rehacer restauran también la selección', () => {
    let estado = crearHistorial('abc', { start: 0, end: 0 }, 0);
    estado = registrarEnHistorial(estado, 'abc!', { start: 4, end: 4 }, 'texto', 100);
    const atras = deshacerHistorial(estado)!;
    expect(atras.entrada.seleccion).toEqual({ start: 0, end: 0 });
    const adelante = rehacerHistorial(atras.estado)!;
    expect(adelante.entrada.seleccion).toEqual({ start: 4, end: 4 });
  });

  it('registrar después de deshacer elimina el futuro', () => {
    let estado = crearHistorial('a', SEL, 0);
    estado = registrarEnHistorial(estado, 'ab', SEL, 'texto', 100);
    estado = registrarEnHistorial(estado, 'abc', SEL, 'formato', 200);
    const atras = deshacerHistorial(estado)!;
    const reescrito = registrarEnHistorial(
      atras.estado,
      'abX',
      SEL,
      'texto',
      2000,
    );
    expect(reescrito.entradas.map((e) => e.markdown)).toContain('abX');
    expect(puedeRehacer(reescrito)).toBe(false);
  });

  it('el estado inicial no permite deshacer', () => {
    const estado = crearHistorial('', SEL, 0);
    expect(puedeDeshacer(estado)).toBe(false);
    expect(puedeRehacer(estado)).toBe(false);
  });

  it('escribir justo después de deshacer conserva el estado recuperado', () => {
    let estado = crearHistorial('', SEL, 0);
    estado = registrarEnHistorial(estado, 'a', SEL, 'texto', 100);
    // Pausa: crea una entrada nueva y deja tipoUltimo='texto'.
    estado = registrarEnHistorial(estado, 'ab', SEL, 'texto', 1000);
    const atras = deshacerHistorial(estado)!;
    expect(entradaActual(atras.estado).markdown).toBe('a');

    const editado = registrarEnHistorial(
      atras.estado,
      'aZ',
      SEL,
      'texto',
      1100,
    );
    const segundoUndo = deshacerHistorial(editado)!;
    expect(entradaActual(segundoUndo.estado).markdown).toBe('a');
  });
});
