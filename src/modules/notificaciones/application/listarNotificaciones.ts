import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Notificacion } from '../domain/notificacion';
import type { INotificacionRepository } from '../domain/ports';

/**
 * Caso de uso: listar la bandeja de notificaciones del usuario autenticado.
 *
 * Solo se exponen las filas del propio usuario (RLS). Soporta filtro opcional
 * para "solo no leídas" y paginado básico (limit/offset). Orden descendente
 * por `created_at` para que el cliente vea primero lo más reciente.
 */
export class ListarNotificaciones {
  constructor(
    private readonly repo: INotificacionRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(
    claims: Claims,
    filtro: { soloNoLeidas: boolean; limit: number; offset: number },
  ): Promise<Notificacion[]> {
    return this.uow.runAs(claims, async (tx) => this.repo.listar(tx, filtro));
  }
}
