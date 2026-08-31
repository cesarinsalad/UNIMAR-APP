import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { EventBus } from '../../../shared/kernel/eventos';
import { BadRequestError } from '../../../shared/errors';
import type { IUsuarioIdResolver } from '../../../shared/kernel/cedulaResolver';

/**
 * Caso de uso "sistema": registrar la publicación de una nota por un
 * profesor.
 *
 * Validaciones:
 *  - Datos completos (materia, cédula, nota 0-20, periodo).
 *  - El estudiante (cédula) debe existir en la base local; resolvemos su
 *    `usuario_id` (UUID) para que el fan-out (Commit 3) pueda crear la
 *    notificación dirigida a él.
 *
 * La resolución cédula → UUID se hace vía el puerto
 * `IUsuarioIdResolver` del shared kernel (NO con `tx.query` directo), para
 * mantener la encapsulación y la metodología DSBC.
 *
 * Si se inyecta un `EventBus`, emite `NOTA_PUBLICADA` dentro del tx para
 * que Notificaciones haga el fan-out (notificación in-app + push). Sin
 * bus: comportamiento noop (solo validación y resolución), útil para
 * tests y para el caso en que aún no exista integración con Notificaciones.
 */
export interface PublicarNotaInput {
  materiaId: string;
  materiaNombre: string;
  cedulaEstudiante: string;
  nota: number;
  periodo: string;
}

export interface PublicarNotaResultado {
  usuarioId: string;
}

export class PublicarNota {
  constructor(
    private readonly usuarioIdResolver: IUsuarioIdResolver,
    private readonly uow: UnitOfWork,
    private readonly eventos?: EventBus,
  ) {}

  async ejecutar(input: PublicarNotaInput): Promise<PublicarNotaResultado> {
    validarNota(input.nota);

    const { usuarioId, jobs } = await this.uow.run(async (tx) => {
      const usuarioId = await this.usuarioIdResolver.obtenerUsuarioIdPorCedula(
        tx,
        input.cedulaEstudiante,
      );

      const jobs = this.eventos
        ? await this.eventos.publicar({
            tipo: 'NOTA_PUBLICADA',
            tx,
            materiaId: input.materiaId,
            materiaNombre: input.materiaNombre,
            usuarioId,
            nota: input.nota,
            periodo: input.periodo,
          })
        : [];

      return { usuarioId, jobs };
    });

    for (const job of jobs) {
      try {
        await job();
      } catch (err) {
        console.error('[academico:publicarNota] job post-commit falló:', err);
      }
    }

    return { usuarioId };
  }
}

function validarNota(nota: number): void {
  if (!Number.isFinite(nota)) {
    throw new BadRequestError('La nota debe ser un número finito');
  }
  if (nota < 0 || nota > 20) {
    throw new BadRequestError('La nota debe estar entre 0 y 20');
  }
}
