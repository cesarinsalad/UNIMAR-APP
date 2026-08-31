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
      semestre: 7,
      promedio: 16.4,
      estatus: 'ACTIVO',
    };
  }

  async materias(_cedula: string, _periodo?: string): Promise<MateriaDTO[]> {
    await sleep(LATENCIA_SIMULADA_MS);
    return [
      {
        id: 'mat-1',
        codigo: 'IS-701',
        nombre: 'Bases de Datos II',
        creditos: 4,
        es_actual: true,
        profesor: 'Dra. Pérez',
        aula: 'A-12',
        horario: 'Lun-Mié 9:00-10:30',
        cortes: [
          { nombre: 'Parcial 1', fecha: '2026-09-15', ponderacion: 30, nota: 14 },
          { nombre: 'Parcial 2', fecha: '2026-10-20', ponderacion: 30, nota: null },
          { nombre: 'Final', fecha: '2026-12-01', ponderacion: 40, nota: null },
        ],
      },
      {
        id: 'mat-2',
        codigo: 'IS-703',
        nombre: 'Desarrollo de Software',
        creditos: 5,
        es_actual: true,
        profesor: 'Mg. Rosales',
        aula: 'B-04',
        horario: 'Mar-Jue 14:00-15:30',
        cortes: [
          { nombre: 'Proyecto 1', fecha: '2026-09-30', ponderacion: 25, nota: null },
          { nombre: 'Proyecto 2', fecha: '2026-11-10', ponderacion: 35, nota: null },
          { nombre: 'Final', fecha: '2026-12-05', ponderacion: 40, nota: null },
        ],
      },
      {
        id: 'mat-hist-1',
        codigo: 'IS-501',
        nombre: 'Algoritmos I',
        creditos: 4,
        es_actual: false,
        periodo: '2025-2',
        nota_final: 18,
        estado: 'APROBADA',
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
    '20123456': 'Ana Estudiante',
    '17420667': 'Flavio Rosales (Comunicador)',
    '30065516': 'César García (Admin)',
  };
  return map[cedula] ?? `Estudiante ${cedula}`;
}
