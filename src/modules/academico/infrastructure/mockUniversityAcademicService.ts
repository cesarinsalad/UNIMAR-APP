import { ServiceUnavailableError } from '../../../shared/errors';
import type {
  HistorialMedicoDTO,
  MateriaDTO,
  MateriaHistoricaDTO,
  PensumDTO,
  PerfilAcademico,
} from '../domain/dtos';
import type { IUniversityAcademicService } from '../domain/ports';

/**
 * Implementación mock del puerto `IUniversityAcademicService` (Paso 5).
 *
 * Misma estrategia que `MockUniversityAuthService`: datos hardcoded con
 * latencia simulada. Cuando UNIMAR entregue la API real, se sustituye por
 * `ApiUniversityAcademicService` sin tocar el dominio.
 *
 * Los datos son coherentes con los usuarios mock de identidad (mismas
 * cédulas) para que las pruebas E2E funcionen con el mismo set de
 * credenciales.
 */
const LATENCIA_SIMULADA_MS = 300;

export class MockUniversityAcademicService implements IUniversityAcademicService {
  async perfil(cedula: string): Promise<PerfilAcademico> {
    await sleep(LATENCIA_SIMULADA_MS);
    return {
      cedula,
      nombre: nombrePorCedula(cedula),
      carrera: 'Ingeniería de Sistemas',
      semestre: 12,
      promedio: 15.2,
      estatus: 'ACTIVO',
    };
  }

  async materias(_cedula: string, _periodo?: string): Promise<MateriaDTO[]> {
    await sleep(LATENCIA_SIMULADA_MS);
    return [
      {
        id: 'mat-1',
        codigo: 'AUS1205341',
        nombre: 'Auditoría de Sistemas',
        creditos: 3,
        es_actual: true,
        seccion: 'P-01',
        profesor: 'Daniela López',
        aula: 'A21',
        horario: 'Mié 10:20-12:35 (A21) · Jue 11:50-01:35 (A40)',
        dias_semana: [3, 4],
        hora_inicio: '10:20',
        hora_fin: '12:35',
        franjas: [
          { dia_semana: 3, aula: 'A21', hora_inicio: '10:20', hora_fin: '12:35' },
          { dia_semana: 4, aula: 'A40', hora_inicio: '11:50', hora_fin: '13:35' },
        ],
        cortes: [
          { nombre: 'Parcial 1', fecha: '2026-09-15', ponderacion: 30, nota: 14 },
          { nombre: 'Parcial 2', fecha: '2026-10-20', ponderacion: 30, nota: null },
          { nombre: 'Final', fecha: '2026-12-01', ponderacion: 40, nota: null },
        ],
      },
      {
        id: 'mat-2',
        codigo: 'SIO1204341',
        nombre: 'Simulación y Optimización',
        creditos: 3,
        es_actual: true,
        seccion: 'P-01',
        profesor: 'Jhonny Granado',
        aula: 'L04',
        horario: 'Mié 07:10-08:40 (L04) · Jue 10:20-11:50 (L04)',
        dias_semana: [3, 4],
        hora_inicio: '07:10',
        hora_fin: '08:40',
        franjas: [
          { dia_semana: 3, aula: 'L04', hora_inicio: '07:10', hora_fin: '08:40' },
          { dia_semana: 4, aula: 'L04', hora_inicio: '10:20', hora_fin: '11:50' },
        ],
        cortes: [
          { nombre: 'Parcial 1', fecha: '2026-09-30', ponderacion: 30, nota: null },
          { nombre: 'Parcial 2', fecha: '2026-11-10', ponderacion: 30, nota: null },
          { nombre: 'Final', fecha: '2026-12-05', ponderacion: 40, nota: null },
        ],
      },
      {
        id: 'mat-3',
        codigo: 'TRI1206441',
        nombre: 'Trabajo de Investigación II',
        creditos: 3,
        es_actual: true,
        seccion: 'P-01',
        profesor: 'Raimond Rivas',
        aula: 'L05',
        horario: 'Lun 11:50-02:20 (L05) · Mar 11:05-01:35 (A40)',
        dias_semana: [1, 2],
        hora_inicio: '11:50',
        hora_fin: '14:20',
        franjas: [
          { dia_semana: 1, aula: 'L05', hora_inicio: '11:50', hora_fin: '14:20' },
          { dia_semana: 2, aula: 'A40', hora_inicio: '11:05', hora_fin: '13:35' },
        ],
        cortes: [
          { nombre: 'Parcial 1', fecha: '2026-09-30', ponderacion: 30, nota: null },
          { nombre: 'Parcial 2', fecha: '2026-11-10', ponderacion: 30, nota: null },
          { nombre: 'Final', fecha: '2026-12-05', ponderacion: 40, nota: null },
        ],
      },
      ...historicas(),
    ];
  }

  async materiaDetalle(_cedula: string, materiaId: string): Promise<MateriaDTO> {
    await sleep(LATENCIA_SIMULADA_MS);
    const detalle = await this.materias(_cedula);
    const found = detalle.find((m) => m.id === materiaId);
    if (!found) {
      throw new ServiceUnavailableError(`Materia ${materiaId} no encontrada en la universidad`);
    }
    return found;
  }

  async pensum(_cedula: string, carreraId: string): Promise<PensumDTO> {
    await sleep(LATENCIA_SIMULADA_MS);
    return {
      carrera: carreraId,
      materias: [
        {
          codigo: 'IS-101',
          nombre: 'Programación I',
          creditos: 4,
          semestreSugerido: 1,
          prerequisitos: [],
        },
        {
          codigo: 'IS-102',
          nombre: 'Matemática Discreta',
          creditos: 3,
          semestreSugerido: 1,
          prerequisitos: [],
        },
        {
          codigo: 'IS-201',
          nombre: 'Programación II',
          creditos: 4,
          semestreSugerido: 2,
          prerequisitos: ['IS-101'],
        },
        {
          codigo: 'IS-701',
          nombre: 'Bases de Datos II',
          creditos: 4,
          semestreSugerido: 7,
          prerequisitos: ['IS-501'],
        },
      ],
    };
  }

  async historialMedico(cedula: string): Promise<HistorialMedicoDTO> {
    await sleep(LATENCIA_SIMULADA_MS);
    return {
      cedula,
      tipoSangre: 'O+',
      alergias: ['Penicilina'],
      vacunas: [
        { nombre: 'Hepatitis B', fecha: '2024-03-15' },
        { nombre: 'Tétanos', fecha: '2023-08-02' },
      ],
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Historial académico (kardex) ───────────────────────────────────

/**
 * Kardex real de un estudiante del 12º trimestre (cursos aprobados y
 * reprobados por período). Codificación de períodos UNIMAR: `AAAA-T`
 * donde el término 1=Enero-Abril, 2=Abril-Julio, 3=Septiembre-Diciembre
 * y 0=intensivo de Agosto.
 *
 * Regla de estado: nota numérica ≥10 APROBADA, <10 REPROBADA. Los cursos
 * sin nota numérica ('AP', por ejemplo práctica profesional) quedan
 * APROBADA con nota_final null — el cliente los muestra con '—'.
 * El promedio del perfil (15.2) es la media simple de las 67 notas
 * numéricas de esta tabla.
 */
type NotaHistorica = number | 'AP';
type TuplaHistorica = [codigo: string, nombre: string, periodo: string, nota: NotaHistorica];

const KARDEX: TuplaHistorica[] = [
  // Trimestre Septiembre-Diciembre 2022
  ['IIG0104341', 'Introducción a la Ingeniería de Sistemas', '2022-3', 18],
  ['ITI0104300', 'Introducción a la Tecnología de la Información', '2022-3', 16],
  ['FOC0104300', 'Formación Ciudadana', '2022-3', 19],
  ['GRL0104300', 'Gramática y Lectura', '2022-3', 19],
  ['INM0104300', 'Introducción a la Matemática', '2022-3', 10],
  ['TEE0104300', 'Técnicas de Estudio', '2022-3', 17],
  ['ADR0102100', 'Actividades Deportivas y Recreativas', '2022-3', 10],
  // Trimestre Enero-Abril 2023
  ['DIB0203141', 'Dibujo I', '2023-1', 16],
  ['AMS0204300', 'Ambiente Sostenible', '2023-1', 17],
  ['GEA0205341', 'Geometría Analítica', '2023-1', 10],
  ['MAT0205341', 'Matemática I', '2023-1', 15],
  ['ALD0204341', 'Álgebra Discreta', '2023-1', 12],
  ['IDR0204300', 'Identidad Regional', '2023-1', 20],
  ['QUG0205341', 'Química General', '2023-1', 11],
  // Trimestre Mayo-Julio 2023
  ['ALL0304341', 'Álgebra Lineal', '2023-2', 10],
  ['DPL0302200', 'Desarrollo del Pensamiento Lógico', '2023-2', 15],
  ['FIS0304341', 'Física I', '2023-2', 10],
  ['MAT0305341', 'Matemática II', '2023-2', 5],
  ['INI0304341', 'Inglés Instrumental I', '2023-2', 15],
  ['TEP0304341', 'Técnicas de Programación', '2023-2', 14],
  ['DIB0303141', 'Dibujo II', '2023-2', 19],
  // Intensivo Agosto 2023
  ['MAT0305341', 'Matemática II', '2023-0', 15],
  // Trimestre Septiembre-Diciembre 2023
  ['DDD0402200', 'Dinámica del Desarrollo', '2023-3', 18],
  ['INI0404341', 'Inglés Instrumental II', '2023-3', 17],
  ['MAT0405341', 'Matemática III', '2023-3', 9],
  ['PRO0405341', 'Programación I', '2023-3', 15],
  ['LSP0402200', 'Liderazgo Social y Político Contemporáneo en Latinoamérica', '2023-3', 16],
  ['LAF0403141', 'Laboratorio de Física I', '2023-3', 13],
  ['FIS0405341', 'Física II', '2023-3', 14],
  // Trimestre Enero-Abril 2024
  ['MAT0405341', 'Matemática III', '2024-1', 12],
  ['CIE0505341', 'Circuitos Eléctricos', '2024-1', 11],
  ['PRO0505341', 'Programación II', '2024-1', 10],
  ['ESD0504341', 'Estructura de Datos', '2024-1', 11],
  ['MER0505341', 'Mecánica Racional', '2024-1', 11],
  // Trimestre Abril-Julio 2024
  ['BAD0604341', 'Base de Datos I', '2024-2', 14],
  ['ELE0606341', 'Electrónica', '2024-2', 13],
  ['PRO0605341', 'Programación III', '2024-2', 15],
  ['SIS0605341', 'Sistemas I', '2024-2', 17],
  ['HAT0302200', 'Herramientas y Aplicaciones Tecnológicas para el Aprendizaje', '2024-2', 16],
  ['MAT0505341', 'Matemática IV', '2024-2', 13],
  // Trimestre Septiembre-Diciembre 2024
  ['ESP0605341', 'Estadística y Probabilidades', '2024-3', 12],
  ['BAD0705341', 'Base de Datos II', '2024-3', 10],
  ['SID0705341', 'Sistemas Digitales', '2024-3', 13],
  ['SIS0705341', 'Sistemas II', '2024-3', 17],
  ['MEF0805341', 'Mecánica de Fluidos', '2024-3', 18],
  // Trimestre Enero-Abril 2025
  ['PRO0705341', 'Programación IV', '2025-1', 16],
  ['ESA0704341', 'Estadística Aplicada', '2025-1', 16],
  ['SIS0005341', 'Sistemas III', '2025-1', 17],
  ['ARC0804341', 'Arquitectura del Computador', '2025-1', 19],
  ['INO0804341', 'Investigación de Operaciones para Ingenieros', '2025-1', 17],
  // Trimestre Abril-Julio 2025
  ['INI0504341', 'Inglés Instrumental III', '2025-2', 15],
  ['CAN0804341', 'Cálculo Numérico', '2025-2', 13],
  ['INE0904341', 'Ingeniería Económica', '2025-2', 18],
  ['SIC0905341', 'Sistemas de Controles', '2025-2', 16],
  ['SIG0905341', 'Sistemas de Información Gerencial', '2025-2', 20],
  // Trimestre Septiembre-Diciembre 2025
  ['SIO0904341', 'Sistemas Operativos', '2025-3', 19],
  ['HEG1004341', 'Herramientas Gerenciales', '2025-3', 20],
  ['SIS1004341', 'Sistemas de Señales', '2025-3', 16],
  ['ECP1104341', 'Evaluación y Control de Proyectos', '2025-3', 19],
  ['ADR0904341', 'Administración de Redes', '2025-3', 18],
  ['MEI0904341', 'Metodología de la Investigación', '2025-3', 18],
  // Trimestre Enero-Abril 2026
  ['MDS1004241', 'Metodología de Desarrollo de Software', '2026-1', 18],
  ['RED1005341', 'Redes de Datos', '2026-1', 20],
  ['SMI1004341', 'Seminario Metodológico de Investigación', '2026-1', 'AP'],
  ['SFL1004341', 'Software Libre', '2026-1', 20],
  ['SEI1004341', 'Seguridad Informática', '2026-1', 20],
  // Trimestre Abril-Julio 2026
  ['INT1105341', 'Introducción a las Telecomunicaciones', '2026-2', 20],
  ['PRP1107441', 'Práctica Profesional', '2026-2', 'AP'],
  ['TRI1106341', 'Trabajo de Investigación I', '2026-2', 'AP'],
  ['EDP1203341', 'Ética y Deontología Profesional', '2026-2', 16],
];

function historicas(): MateriaHistoricaDTO[] {
  return KARDEX.map(([codigo, nombre, periodo, nota], i) => ({
    id: `hist-${i + 1}`,
    codigo,
    nombre,
    creditos: 3,
    es_actual: false,
    periodo,
    nota_final: nota === 'AP' ? null : nota,
    estado: nota === 'AP' || nota >= 10 ? 'APROBADA' : 'REPROBADA',
  }));
}

function nombrePorCedula(cedula: string): string {
  // Helper simple para que el mock devuelva datos coherentes por cédula.
  // En producción este mapeo vendría de UNIMAR.
  const map: Record<string, string> = {
    '20123456': 'Ana Administradora',
    '17420667': 'Flavio Rosales (Comunicador)',
    '30065516': 'César García',
  };
  return map[cedula] ?? `Estudiante ${cedula}`;
}
