import {
  agruparPorTrimestre,
  colorNota,
  etiquetaEstadoHistorica,
  filtrarPorPeriodo,
  marcarAprobadas,
  particionarMaterias,
  periodosDisponibles,
} from './helpers';
import type { MateriaDTO, MateriaHistoricaDTO, PensumMateriaDTO } from './types';

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
