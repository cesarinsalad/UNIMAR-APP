import {
  agruparPorDia,
  claveDia,
  matrizMes,
  mesAnterior,
  mesSiguiente,
  tituloDia,
  ventanaMes,
} from './calendario-calculo';

const HOY_FIJO = new Date('2026-09-16T10:00:00');

describe('ventanaMes', () => {
  it('septiembre 2026: desde 1ro 00:00, hasta 30 último ms', () => {
    const v = ventanaMes(2026, 8);
    const desde = new Date(v.desde);
    const hasta = new Date(v.hasta);
    expect(desde.getFullYear()).toBe(2026);
    expect(desde.getMonth()).toBe(8);
    expect(desde.getDate()).toBe(1);
    expect(hasta.getDate()).toBe(30);
    expect(hasta.getHours()).toBe(23);
    expect(v.clave).toBe('2026-09');
    expect(v.etiqueta.toLowerCase()).toContain('septiembre');
  });

  it('rango máximo < 90 días (límite del contrato)', () => {
    const v = ventanaMes(2026, 0); // enero (31 días)
    expect(new Date(v.hasta).getTime() - new Date(v.desde).getTime()).toBeLessThan(
      90 * 24 * 60 * 60 * 1000,
    );
  });
});

describe('navegación de meses', () => {
  it('mesAnterior y mesSiguiente normalizan el año', () => {
    expect(mesAnterior(2026, 0)).toEqual([2025, 11]);
    expect(mesSiguiente(2026, 11)).toEqual([2027, 0]);
    expect(mesAnterior(2026, 8)).toEqual([2026, 7]);
    expect(mesSiguiente(2026, 8)).toEqual([2026, 9]);
  });
});

describe('matrizMes (lunes primero)', () => {
  it('siempre 6 semanas × 7 días', () => {
    const matriz = matrizMes(2026, 8, HOY_FIJO);
    expect(matriz).toHaveLength(6);
    for (const semana of matriz) {
      expect(semana).toHaveLength(7);
    }
  });

  it('la primera fila comienza con LUNES que contiene al 1ero del mes', () => {
    // 1 de septiembre de 2026 es MARTES → el lunes previo es el 31 de agosto.
    const matriz = matrizMes(2026, 8, HOY_FIJO);
    const primeraSemana = matriz[0]!;
    expect(primeraSemana[0]!.clave).toBe('2026-08-31');
    expect(primeraSemana[0]!.delMes).toBe(false);
    expect(primeraSemana[1]!.clave).toBe('2026-09-01');
    expect(primeraSemana[1]!.delMes).toBe(true);
  });

  it('marca el día de hoy con esHoy', () => {
    const matriz = matrizMes(2026, 8, HOY_FIJO);
    const todas = matriz.flat();
    const hoy = todas.filter((c) => c.esHoy);
    expect(hoy).toHaveLength(1);
    expect(hoy[0]!.clave).toBe('2026-09-16');
  });

  it('rellena los días de los meses contiguos', () => {
    const matriz = matrizMes(2026, 9, HOY_FIJO); // octubre
    const fuera = matriz.flat().filter((c) => !c.delMes);
    expect(fuera.length).toBeGreaterThan(0);
  });
});

describe('agruparPorDia', () => {
  const base = {
    id: 'e',
    titulo: 't',
    tipo: 'PERSONAL' as const,
    diaCompleto: false,
    decanatoIds: [],
  };

  it('agrupa por día local y ordena cronológicamente los días', () => {
    const grupos = agruparPorDia([
      { ...base, id: 'a', inicioAt: '2026-09-02T09:00:00-04:00' },
      { ...base, id: 'b', tipo: 'OFICIAL', inicioAt: '2026-09-02T14:00:00-04:00' },
      { ...base, id: 'c', inicioAt: '2026-09-01T08:00:00-04:00' },
    ]);
    expect(grupos.map((g) => g.clave)).toEqual(['2026-09-01', '2026-09-02']);
    expect(grupos.find((g) => g.clave === '2026-09-02')!.eventos.map((e) => e.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('evento de todo el día cae en su fecha local', () => {
    const grupos = agruparPorDia([
      { ...base, id: 'd1', inicioAt: '2026-09-16T00:00:00-04:00', diaCompleto: true },
    ]);
    expect(grupos[0]!.clave).toBe('2026-09-16');
  });
});

describe('tituloDia', () => {
  it('Hoy y Mañana comparando claves, con hoy inyectable', () => {
    expect(tituloDia('2026-09-16', HOY_FIJO)).toBe('Hoy');
    expect(tituloDia('2026-09-17', HOY_FIJO)).toBe('Mañana');
  });

  it('otro día → fecha larga con weekday', () => {
    const titulo = tituloDia('2026-09-19', HOY_FIJO);
    expect(titulo).toContain('2026');
    expect(titulo.toLowerCase()).toContain('septiembre');
  });
});

describe('claveDia', () => {
  it('pad de mes y día', () => {
    expect(claveDia(new Date(2026, 8, 4))).toBe('2026-09-04');
  });
});