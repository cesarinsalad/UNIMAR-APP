import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Dispositivo, Plataforma } from '../domain/dispositivo';
import type { IDispositivoRepository } from '../domain/ports';

/**
 * Caso de uso: registrar (o reasignar) un dispositivo para push.
 *
 * El `usuarioId` se toma SIEMPRE del JWT (`claims.sub`), nunca del body:
 * es la identidad bajo la que `RegistrarDispositivo` ejecuta la transacción
 * (`uow.runAs`). La función RPC `public.reasignar_dispositivo` (SECURITY
 * DEFINER) eleva privilegios internamente para hacer el UPSERT que reasigna
 * el `push_token` al usuario activo cuando ya pertenecía a otro (mismo
 * dispositivo físico, nuevo login). Resultado: el usuario activo del
 * dispositivo siempre recibe sus notificaciones; nadie queda sin push.
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
      return dispositivo;
    });
  }
}