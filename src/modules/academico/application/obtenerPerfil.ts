import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { DbTx } from '../../../shared/kernel/db';
import type { ICedulaResolver } from '../../../shared/kernel/cedulaResolver';
import type { IUniversityAcademicService } from '../domain/ports';
import type { PerfilAcademico } from '../domain/dtos';

/**
 * Caso de uso: obtener el perfil académico del usuario autenticado.
 *
 * La cédula se resuelve localmente desde `usuarios.cedula` vía
 * `ICedulaResolver` (puerto del shared kernel). Esto evita que Académico
 * haga `tx.query` directo, manteniendo la encapsulación de la base de
 * datos y la metodología DSBC: Académico solo conoce puertos.
 */
export class ObtenerPerfil {
  constructor(
    private readonly academic: IUniversityAcademicService,
    private readonly cedulaResolver: ICedulaResolver,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims): Promise<PerfilAcademico> {
    return this.uow.run(async (tx) => {
      const cedula = await this.cedulaResolver.obtenerCedula(tx, claims.sub);
      return this.academic.perfil(cedula);
    });
  }
}

/**
 * Helper exportado para casos de uso que necesiten la cédula con el mismo
 * patrón (resolución via puerto + transacción). Reduce duplicación.
 */
export async function resolverCedula(
  tx: DbTx,
  claims: Claims,
  cedulaResolver: ICedulaResolver,
): Promise<string> {
  return cedulaResolver.obtenerCedula(tx, claims.sub);
}
