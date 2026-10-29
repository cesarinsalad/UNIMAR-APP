import {
  agruparHistoriasPorAno,
  agruparPorTrimestre,
  colorNota,
  etiquetaAccesibleNota,
  etiquetaEstadoHistorica,
  esNotaCerrada,
  formatearPeriodo,
  marcarAprobadas,
  notaAcumulada,
  palabraNota,
  ponderacionEvaluada,
  particionarMaterias,
  partesPeriodo,
} from './helpers';
import type { CorteDTO, MateriaDTO, PensumMateriaDTO } from './types';

const EN_CURSO = {
  id: 'mat-1',
  codigo: 'IS-701',
  nombre: 'Bases de Datos II',
  creditos: 4,
  es_actual: true as const,
  profesor: 'Dra. Pérez',
  aula: 'A-12',
  horario: 'Lun-Mié 9:00-10:30',
  cortes: [],
};

const HIST_2025_2 = {
  id: 'mat-hist-1',
  codigo: 'IS-501',
  nombre: 'Algoritmos I',
  creditos: 4,
  es_actual: false as const,
  periodo: '2025-2',
  nota_final: 18,
  estado: 'APROBADA' as const,
};

const HIST_2025_1 = {
  ...HIST_2025_2,
  id: 'mat-hist-2',
  codigo: 'IS-102',
  nombre: 'Matemática Discreta',
  periodo: '2025-1',
  nota_final: 7,
  estado: 'REPROBADA' as const,
};

const HIST_2026_1 = {
  ...HIST_2025_2,
  id: 'mat-hist-3',
  codigo: 'IS-301',
  nombre: 'Estructuras de Datos',
  periodo: '2026-1',
  nota_final: 16,
};

describe('colorNota (escala UNIMAR 0–20)', () => {
  it.each([
    [18, 'success'],
    [10, 'success'],
    [9.9, 'danger'],
    [7, 'danger'],
    [null, 'muted'],
  ])('%v → %s', (nota, esperado) => {
    expect(colorNota(nota)).toBe(esperado);
  });
});

describe('etiquetaEstadoHistorica', () => {
  it.each([
    ['APROBADA', 'Aprobada'],
    ['REPROBADA', 'Reprobada'],
    ['RETIRADA', 'Retirada'],
  ] as const)('%s → %s', (estado, etiqueta) => {
    expect(etiquetaEstadoHistorica(estado)).toBe(etiqueta);
  });
});

describe('particionarMaterias (narrowing por es_actual)', () => {
  it('separa actuales de históricas con tipos estrechados', () => {
    const lista: MateriaDTO[] = [EN_CURSO, HIST_2025_2, HIST_2025_1];
    const { actuales, historicas } = particionarMaterias(lista);
    expect(actuales.map((m) => m.id)).toEqual(['mat-1']);
    expect(historicas.map((m) => m.id)).toEqual(['mat-hist-1', 'mat-hist-2']);
    // El narrowing queda probado en compilación: `profesor` solo existe
    // en actuales y `nota_final` solo en históricas.
    expect(actuales[0]?.profesor).toBe('Dra. Pérez');
    expect(historicas[0]?.nota_final).toBe(18);
  });

  it('lista vacía → partición vacía', () => {
    expect(particionarMaterias([])).toEqual({ actuales: [], historicas: [] });
  });
});

describe('agruparHistoriasPorAno (índice por año del historial)', () => {
  it('agrupa por año descendente y por período descendente dentro de cada año', () => {
    const anios = agruparHistoriasPorAno([
      HIST_2025_2,
      HIST_2026_1,
      HIST_2025_1,
      HIST_2025_2,
    ]);
    expect(anios.map((a) => a.anio)).toEqual(['2026', '2025']);
    expect(anios[0]?.grupos.map((g) => g.periodo)).toEqual(['2026-1']);
    expect(anios[1]?.grupos.map((g) => g.periodo)).toEqual(['2025-2', '2025-1']);
    expect(anios[1]?.grupos[0]?.materias.length).toBe(2);
    expect(anios[1]?.grupos[1]?.materias.map((m) => m.id)).toEqual(['mat-hist-2']);
  });

  it('formato ajeno → bucket por año con el término crudo', () => {
    const ajena = { ...HIST_2025_2, id: 'mat-hist-4', periodo: '2025-4' };
    const anios = agruparHistoriasPorAno([HIST_2026_1, ajena]);
    expect(anios.map((a) => a.anio)).toEqual(['2026', '2025']);
    expect(anios[1]?.grupos.map((g) => g.periodo)).toEqual(['2025-4']);
  });

  it('sin historial → sin años', () => {
    expect(agruparHistoriasPorAno([])).toEqual([]);
  });
});

const PENSUM: PensumMateriaDTO[] = [
  { codigo: 'IS-101', nombre: 'Programación I', creditos: 4, semestreSugerido: 1, prerequisitos: [] },
  { codigo: 'IS-201', nombre: 'Programación II', creditos: 4, semestreSugerido: 2, prerequisitos: ['IS-101'] },
  { codigo: 'IS-701', nombre: 'Bases de Datos II', creditos: 4, semestreSugerido: 7, prerequisitos: ['IS-501'] },
];

describe('marcarAprobadas (cruce por código)', () => {
  it('marca solo las coincidentes con histórica APROBADA', () => {
    const pensumConAprobada: PensumMateriaDTO[] = [
      { codigo: 'IS-501', nombre: 'Algoritmos I', creditos: 4, semestreSugerido: 5, prerequisitos: [] },
      ...PENSUM,
    ];
    const resultado = marcarAprobadas(pensumConAprobada, [HIST_2025_2, HIST_2025_1]);
    expect(resultado.find((m) => m.codigo === 'IS-501')?.aprobada).toBe(true);
    expect(resultado.find((m) => m.codigo === 'IS-101')?.aprobada).toBe(false);
    expect(resultado.find((m) => m.codigo === 'IS-701')?.aprobada).toBe(false);
  });

  it('reprobadas no cuentan como aprobadas', () => {
    const resultado = marcarAprobadas(
      [{ codigo: 'IS-102', nombre: 'MD', creditos: 3, semestreSugerido: 1, prerequisitos: [] }],
      [HIST_2025_1],
    );
    expect(resultado[0]?.aprobada).toBe(false);
  });

  it('sin historial → todo pendiente', () => {
    expect(marcarAprobadas(PENSUM, []).every((m) => !m.aprobada)).toBe(true);
  });
});

describe('agruparPorTrimestre', () => {
  it('agrupa por semestreSugerido y ordena ascendente', () => {
    const items = marcarAprobadas(PENSUM, [HIST_2025_2]);
    const grupos = agruparPorTrimestre(items);
    expect(grupos.map((g) => g.trimestre)).toEqual([1, 2, 7]);
    expect(grupos[0]?.items.map((m) => m.codigo)).toEqual(['IS-101']);
  });
});

const CORTE = (nota: number | null, ponderacion: number): CorteDTO => ({
  nombre: 'Corte',
  fecha: '2026-01-01',
  nota,
  ponderacion,
});

describe('notaAcumulada (promedio ponderado truncado)', () => {
  it('20·40% + 15·60% → 17', () => {
    expect(notaAcumulada([CORTE(20, 40), CORTE(15, 60)])).toBe(17);
  });

  it('14·40% + 16·60% = 15,2 → 15 (truncado)', () => {
    expect(notaAcumulada([CORTE(14, 40), CORTE(16, 60)])).toBe(15);
  });

  it('solo promedia cortes calificados', () => {
    expect(notaAcumulada([CORTE(10, 40), CORTE(null, 60)])).toBe(10);
  });

  it('sin cortes calificados → null', () => {
    expect(notaAcumulada([CORTE(null, 40)])).toBeNull();
    expect(notaAcumulada([])).toBeNull();
  });

  it('más de dos cortes se aceptan', () => {
    expect(notaAcumulada([CORTE(10, 20), CORTE(20, 20), CORTE(0, 60)])).toBe(6);
  });
});

describe('ponderacionEvaluada (Σ de cortes calificados)', () => {
  it('suma solo lo calificado (14 en Corte 1 40% → 40)', () => {
    expect(ponderacionEvaluada([CORTE(14, 40), CORTE(null, 60)])).toBe(40);
  });

  it('sin notas → 0', () => {
    expect(ponderacionEvaluada([CORTE(null, 40)])).toBe(0);
    expect(ponderacionEvaluada([])).toBe(0);
  });
});

describe('esNotaCerrada (acta completa del plan UNIMAR 40/60)', () => {
  it('cortes 1 y 2 calificados con Σ 100 → cerrada', () => {
    expect(esNotaCerrada([CORTE(14, 40), CORTE(16, 60)])).toBe(true);
  });

  it('falta un corte → abierta', () => {
    expect(esNotaCerrada([CORTE(14, 40), CORTE(null, 60)])).toBe(false);
  });

  it('cortes calificados pero Σ ≠ 100 → abierta', () => {
    expect(esNotaCerrada([CORTE(14, 30), CORTE(16, 30)])).toBe(false);
  });

  it('sin cortes → abierta', () => {
    expect(esNotaCerrada([])).toBe(false);
  });
});

describe('palabraNota / etiquetaAccesibleNota (voz accesible del semáforo)', () => {
  it.each([
    [16, 'aprobada'],
    [10, 'aprobada'],
    [9.9, 'reprobada'],
    [null, 'sin calificar'],
  ] as const)('palabraNota(%v) → %s', (nota, esperado) => {
    expect(palabraNota(nota)).toBe(esperado);
  });

  it.each([
    [16, '16 puntos, aprobada'],
    [9.5, '9 puntos, reprobada'],
    [null, 'Sin nota'],
  ] as const)('etiquetaAccesibleNota(%v) → %s', (nota, esperado) => {
    expect(etiquetaAccesibleNota(nota)).toBe(esperado);
  });
});

describe('formatearPeriodo (tríada UNIMAR)', () => {
  it.each([
    ['2026-1', 'Trimestre Enero-Abril 2026'],
    ['2026-2', 'Trimestre Abril-Julio 2026'],
    ['2026-3', 'Trimestre Septiembre-Diciembre 2026'],
  ])('%s → %s', (periodo, esperado) => {
    expect(formatearPeriodo(periodo)).toBe(esperado);
  });

  it('intensivo de agosto (término 0) → etiqueta especial', () => {
    expect(formatearPeriodo('2023-0')).toBe('Agosto (Intensivo) 2023');
  });

  it('formato ajeno → crudo', () => {
    expect(formatearPeriodo('2025-4')).toBe('2025-4');
    expect(formatearPeriodo('X')).toBe('X');
  });
});

describe('partesPeriodo (ancla del acordeón)', () => {
  it.each([
    ['2026-1', '2026', 'Enero-Abril'],
    ['2026-2', '2026', 'Abril-Julio'],
    ['2026-3', '2026', 'Septiembre-Diciembre'],
    ['2023-0', '2023', 'Agosto (Intensivo)'],
  ])('%s → %s / %s', (periodo, anio, termino) => {
    expect(partesPeriodo(periodo)).toEqual({ anio, termino });
  });

  it('formato ajeno → sin término (cae a etiqueta plana)', () => {
    expect(partesPeriodo('2025-4')).toEqual({ anio: '2025', termino: null });
    expect(partesPeriodo('X')).toEqual({ anio: 'X', termino: null });
  });
});
