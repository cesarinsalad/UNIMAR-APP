import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { ConflictError } from '../../../shared/errors';
import type { Dispositivo, Plataforma } from '../domain/dispositivo';
import type { IDispositivoRepository } from '../domain/ports';

/**
 * Caso de uso: registrar (o re-registrar) un dispositivo para push.
 *
 * El `usuarioId` se toma SIEMPRE del JWT (`claims.sub`), nunca del body:
 * la política RLS de `dispositivos` exige `usuario_id = claims.sub` y el
 * dominio lo re-afirma por defensa en profundidad. El cuerpo solo aporta
 * `push_token` y `plataforma`.
 *
 * Edge case: si el `push_token` ya está asociado a OTRO usuario, el repositorio
 * devuelve `null` (el ON CONFLICT con WHERE de igual propietario + RLS aísla
 * la fila ajena). Esto se traduce en `ConflictError(409)` para que el cliente
 * libere el token de la sesión anterior.
 */
export class RegistrarDispositivo {
  constructor(
    private readonly repo: IDispositivoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(
    claims: Claims,
    input: { pushToken: string; plataforma: Plataforma },
  ): Promise<Dispositivo> {
    return this.uow.runAs(claims, async (tx) => {
      const dispositivo = await this.repo.upsert(tx, {
        usuarioId: claims.sub,
        pushToken: input.pushToken,
        plataforma: input.plataforma,
      });
      if (!dispositivo) {
        throw new ConflictError('Token ya registrado en otro dispositivo');
      }
      return dispositivo;
    });
  }
}
