import { ServiceUnavailableError } from '../../../shared/errors';
import type {
  HistorialMedicoDTO,
  MateriaDTO,
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
      promedio: 16.4,
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
