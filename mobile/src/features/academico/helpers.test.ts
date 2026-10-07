import {
  agruparPorTrimestre,
  colorNota,
  etiquetaEstadoHistorica,
  filtrarPorPeriodo,
  formatearPeriodo,
  formatoNota2,
  marcarAprobadas,
  notaAcumulada,
  particionarMaterias,
  periodosDisponibles,
} from './helpers';
import type { CorteDTO, MateriaDTO, MateriaHistoricaDTO, PensumMateriaDTO } from './types';

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

describe('periodosDisponibles', () => {
  it('únicos y descendentes para el selector', () => {
    expect(periodosDisponibles([HIST_2025_2, HIST_2025_1, HIST_2025_2])).toEqual([
      '2025-2',
      '2025-1',
    ]);
  });

  it('sin historial → sin opciones', () => {
    const vacias: MateriaHistoricaDTO[] = [];
    expect(periodosDisponibles(vacias)).toEqual([]);
  });
});

describe('filtrarPorPeriodo', () => {
  const lista = [HIST_2025_2, HIST_2025_1];

  it('null → todo el historial', () => {
    expect(filtrarPorPeriodo(lista, null)).toHaveLength(2);
  });

  it('período concreto → solo sus materias', () => {
    expect(filtrarPorPeriodo(lista, '2025-1').map((m) => m.id)).toEqual(['mat-hist-2']);
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

describe('formatoNota2 (dos dígitos)', () => {
  it.each([
    [9, '09'],
    [17, '17'],
    [15.2, '15'],
    [null, '—'],
  ] as const)('%v → %s', (nota, esperado) => {
    expect(formatoNota2(nota)).toBe(esperado);
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

  it('formato ajeno → crudo', () => {
    expect(formatearPeriodo('2025-4')).toBe('2025-4');
    expect(formatearPeriodo('X')).toBe('X');
  });
});
