import type {
  HistorialMedicoDTO,
  MateriaDTO,
  PensumDTO,
  PerfilAcademico,
} from './dtos';

/**
 * Puerto de dominio: contrato de consulta contra la API académica de UNIMAR.
 *
 * Implementaciones:
 *  - `MockUniversityAcademicService` (Paso 5 — actual): datos hardcoded.
 *  - `ApiUniversityAcademicService` (futuro): cuando UNIMAR entregue los
 *    endpoints, se hace swap por inyección de dependencias sin tocar el
 *    dominio (DIP).
 *
 * El parámetro `cedula` es la llave de mapeo del estudiante contra la
 * universidad. El BFF lo resuelve localmente desde `usuarios.cedula`
 * mediante `ICedulaResolver` (otro puerto del shared kernel), evitando
 * depender de la base de datos directamente.
 */
export interface IUniversityAcademicService {
  perfil(cedula: string): Promise<PerfilAcademico>;
  /** `periodo` opcional: ej. "2026-1". Si se omite, devuelve todas. */
  materias(cedula: string, periodo?: string): Promise<MateriaDTO[]>;
  materiaDetalle(cedula: string, materiaId: string): Promise<MateriaDTO>;
  pensum(cedula: string, carreraId: string): Promise<PensumDTO>;
  /** Dato sensible: solo el propio estudiante debe poder consultarlo. */
  historialMedico(cedula: string): Promise<HistorialMedicoDTO>;
}
