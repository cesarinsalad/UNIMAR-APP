import { ServiceUnavailableError } from '../../../shared/errors';
import type {
  HistorialMedicoDTO,
  MateriaDTO,
  PensumDTO,
  PerfilAcademico,
} from '../domain/dtos';
import type { IUniversityAcademicService } from '../domain/ports';

/**
 * Esqueleto del adapter HTTP contra la API académica de UNIMAR (Paso 5).
 *
 * Por defecto hace fetch real contra la URL configurada en `UNIMAR_API_URL`.
 * Si `UNIMAR_API_URL` está vacía, falla con `ServiceUnavailableError`
 * (la API real aún no está disponible). El dominio sigue funcionando
 * porque `MockUniversityAcademicService` se usa mientras tanto.
 *
 * Diseño:
 *  - Usa `fetch` nativo de Node (>=20), sin dependencias nuevas.
 *  - Timeout configurable vía `AbortController` para evitar cuelgues.
 *  - La respuesta se valida contra los schemas Zod del dominio antes
 *    de devolverla; un payload malformado se traduce a error 5xx.
 */
export interface ApiUniversityAcademicServiceOptions {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class ApiUniversityAcademicService implements IUniversityAcademicService {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;

  constructor(options: ApiUniversityAcademicServiceOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 5_000;
  }

  async perfil(cedula: string): Promise<PerfilAcademico> {
    return this.fetchJson<PerfilAcademico>(`/academico/perfil/${encodeURIComponent(cedula)}`);
  }

  async materias(cedula: string, periodo?: string): Promise<MateriaDTO[]> {
    const qs = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
    return this.fetchJson<MateriaDTO[]>(`/academico/materias/${encodeURIComponent(cedula)}${qs}`);
  }

  async materiaDetalle(cedula: string, materiaId: string): Promise<MateriaDTO> {
    return this.fetchJson<MateriaDTO>(
      `/academico/materias/${encodeURIComponent(cedula)}/${encodeURIComponent(materiaId)}`,
    );
  }

  async pensum(cedula: string, carreraId: string): Promise<PensumDTO> {
    return this.fetchJson<PensumDTO>(
      `/academico/pensum/${encodeURIComponent(cedula)}/${encodeURIComponent(carreraId)}`,
    );
  }

  async historialMedico(cedula: string): Promise<HistorialMedicoDTO> {
    return this.fetchJson<HistorialMedicoDTO>(
      `/academico/historial-medico/${encodeURIComponent(cedula)}`,
    );
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

      const res = await fetch(url, { headers, signal: controller.signal });
      if (!res.ok) {
        throw new ServiceUnavailableError(
          `UNIMAR API respondió ${res.status} en ${path}`,
        );
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ServiceUnavailableError) throw err;
      throw new ServiceUnavailableError(
        `No se pudo conectar a la API de UNIMAR (${path}): ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
