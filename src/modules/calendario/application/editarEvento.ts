import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IEventoRepository } from '../domain/ports';
import type { EditarEventoInput, Evento } from '../domain/evento';

/**
 * Caso de uso: editar un evento existente.
 *
 * Reglas de edición:
 *  - PERSONAL: solo el dueño.
 *  - OFICIAL: ADMIN, o el COMUNICADOR que lo creó. RLS refuerza como segunda
 *    barrera.
 *  - COMUNICADOR no puede cambiar la audiencia a un decanato que no sea el
 *    propio (mismo ABAC que en la creación).
 *
 * Validación de fechas: si se actualiza `inicio_at` o `fin_at`, se valida
 * que el rango resultante siga siendo coherente. Si solo se actualiza uno,
 * se compara contra el valor existente.
 */
export class EditarEvento {
  constructor(
    private readonly repo: IEventoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string, input: EditarEventoInput): Promise<Evento> {
    return this.uow.runAs(claims, async (tx) => {
      const existente = await this.repo.buscarPorId(tx, id);
      if (!existente) throw new NotFoundError('Evento no encontrado');

      this.validarPermisos(claims, existente);
      if (input.decanatoIds !== undefined) {
        this.validarAudiencia(claims, existente, input.decanatoIds);
      }
      this.validarFechas(input, existente);

      const actualizado = await this.repo.actualizar(tx, id, {
        titulo: input.titulo,
        descripcion: input.descripcion,
        inicioAt: input.inicioAt,
        finAt: input.finAt,
        diaCompleto: input.diaCompleto,
        recordatorioMinutos: input.recordatorioMinutos,
        decanatoIds: input.decanatoIds,
      });

      if (!actualizado) throw new NotFoundError('Evento no encontrado tras editar');
      return actualizado;
    });
  }

  private validarPermisos(claims: Claims, existente: Evento): void {
    if (existente.tipo === 'PERSONAL') {
      if (existente.usuarioId !== claims.sub) {
        throw new ForbiddenError('No puedes editar un evento personal ajeno');
      }
      return;
    }
    // OFICIAL
    if (claims.role === 'ADMIN') return;
    if (claims.role === 'COMUNICADOR' && existente.usuarioId === claims.sub) return;
    throw new ForbiddenError('No tienes permisos para editar este evento oficial');
  }

  private validarAudiencia(claims: Claims, existente: Evento, decanatoIds: number[]): void {
    // La audiencia solo aplica a OFICIAL; el caso PERSONAL no debería
    // incluirla, pero si llega vacía no es un error.
    if (existente.tipo !== 'OFICIAL') return;
    if (claims.role === 'COMUNICADOR') {
      if (decanatoIds.length !== 1 || decanatoIds[0] !== claims.decanato_id) {
        throw new BadRequestError(
          'El comunicador solo puede mantener la audiencia en su propio decanato',
        );
      }
    }
  }

  private validarFechas(input: EditarEventoInput, existente: Evento): void {
    const inicio = input.inicioAt ?? existente.inicioAt.toISOString();
    const fin = input.finAt ?? existente.finAt?.toISOString() ?? null;
    if (fin && new Date(fin) < new Date(inicio)) {
      throw new BadRequestError('fin_at debe ser mayor o igual a inicio_at');
    }
  }
}
