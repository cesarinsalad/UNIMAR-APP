import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { ICedulaResolver } from '../../../shared/kernel/cedulaResolver';
import type { IUniversityAcademicService } from '../domain/ports';
import type { HistorialMedicoDTO } from '../domain/dtos';
import { ForbiddenError } from '../../../shared/errors';
import { resolverCedula } from './obtenerPerfil';

/**
 * Caso de uso: obtener el historial médico del estudiante autenticado.
 *
 * Regla de privacidad (decisión arquitectónica del Paso 5): **solo el
 * propio estudiante puede consultar su historial médico**. Ni siquiera el
 * ADMIN del sistema tiene acceso. Esto se valida explícitamente en este
 * caso de uso (defensa en profundidad: la capa HTTP lo rechaza antes de
 * llamar al dominio, y aquí se vuelve a verificar si fuera necesario).
 *
 * La cédula objetivo SIEMPRE es la del propio usuario autenticado; no se
 * permite consultar la cédula de otro.
 */
export class ObtenerHistorialMedico {
  constructor(
    private readonly academic: IUniversityAcademicService,
    private readonly cedulaResolver: ICedulaResolver,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, cedulaSolicitada?: string): Promise<HistorialMedicoDTO> {
    return this.uow.run(async (tx) => {
      const cedulaPropia = await resolverCedula(tx, claims, this.cedulaResolver);
      // Si el caller pasa una cédula distinta a la suya, rechazamos.
      if (cedulaSolicitada && cedulaSolicitada !== cedulaPropia) {
        throw new ForbiddenError('Solo puedes consultar tu propio historial médico');
      }
      return this.academic.historialMedico(cedulaPropia);
    });
  }
}
