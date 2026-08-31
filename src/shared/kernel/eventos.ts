import type { DbTx } from './db';

/**
 * Bus de eventos del Shared Kernel (Paso 3).
 *
 * Permite acoplar módulos sin dependencias directas: Comunicaciones emite un
 * evento (ej. COMUNICADO_PUBLICADO) y Notificaciones lo recibe vía handler
 * asíncrono. La idea clave es soportar dos fases:
 *
 *  - **Dentro del tx**: `publicar(evento)` se llama DENTRO de la transacción
 *    abierta por `uow.runAs`. Los handlers reciben `evento.tx` y pueden
 *    insertar filas con los mismos claims activos (ABAC coherente). Son
 *    esperados *sincrónicamente* para que cualquier fallo aborte el COMMIT.
 *
 *  - **Post-COMMIT**: cada handler puede devolver un `TrabajoPostCommit`
 *    (función asíncrona) que el caso de uso ejecuta tras resolverse
 *    `uow.runAs`. Si la transacción hace ROLLBACK, el caso de uso lanza
 *    error y los jobs nunca corren: ningún push se envía si el comunicado
 *    no quedó en PUBLICADO.
 *
 * El bus NO gestiona el ciclo de la transacción; delega al `UnitOfWork`. Esto
 * lo deja como pieza simple, testeable y sin estado compartido (in-process).
 */
export interface EventoComunicadoPublicado {
  tipo: 'COMUNICADO_PUBLICADO';
  tx: DbTx;
  comunicadoId: string;
  titulo: string;
  autorId: string;
  /** `[]` = GLOBAL; n decanatos = audiencia local. */
  decanatoIds: number[];
}

export interface EventoComunicadoRechazado {
  tipo: 'COMUNICADO_RECHAZADO';
  tx: DbTx;
  comunicadoId: string;
  titulo: string;
  autorId: string;
  motivo: string;
}

export interface EventoOficialCreado {
  tipo: 'EVENTO_OFICIAL_CREADO';
  tx: DbTx;
  eventoId: string;
  titulo: string;
  autorId: string;
  /** `[]` = GLOBAL; n decanatos = audiencia local. */
  decanatoIds: number[];
}

/**
 * Notificación de publicación de nota académica (Paso 5).
 * Emitido por el caso de uso `PublicarNota` cuando un sistema externo
 * (simulado vía `POST /sistema/notas`) reporta que un profesor subió una
 * nota. El módulo Notificaciones hace fan-out al estudiante afectado.
 */
export interface EventoNotaPublicada {
  tipo: 'NOTA_PUBLICADA';
  tx: DbTx;
  materiaId: string;
  materiaNombre: string;
  usuarioId: string;
  nota: number;
  periodo: string;
}

export type Evento =
  | EventoComunicadoPublicado
  | EventoComunicadoRechazado
  | EventoOficialCreado
  | EventoNotaPublicada;
export type EventoTipo = Evento['tipo'];

/** Job best-effort que se ejecuta DESPUÉS del COMMIT. Errores: el job los traga y loguea. */
export type TrabajoPostCommit = () => Promise<void>;

export type ManejadorEvento = (evento: Evento) => Promise<TrabajoPostCommit | null>;

export class EventBus {
  private handlers = new Map<EventoTipo, ManejadorEvento[]>();

  /**
   * Suscribe un handler a un tipo de evento concreto. El parámetro de entrada
   * del handler se tipifica con la variante específica del evento, no con la
   * unión completa, para que el call site del composition root no necesite
   * discriminaciones manuales.
   */
  suscribir<T extends EventoTipo>(
    tipo: T,
    handler: (
      evento: Extract<Evento, { tipo: T }>,
    ) => Promise<TrabajoPostCommit | null>,
  ): void {
    const list = this.handlers.get(tipo) ?? [];
    list.push(handler as unknown as ManejadorEvento);
    this.handlers.set(tipo, list);
  }

  /**
   * Ejecuta todos los handlers del tipo de evento de forma secuencial y
   * recoge sus jobs diferidos. Si un handler rechaza, el error se propaga
   * (el caso de uso que llamó `publicar` no hará COMMIT).
   */
  async publicar(evento: Evento): Promise<TrabajoPostCommit[]> {
    const handlers = this.handlers.get(evento.tipo) ?? [];
    const jobs: TrabajoPostCommit[] = [];
    for (const handler of handlers) {
      const job = await handler(evento);
      if (job) jobs.push(job);
    }
    return jobs;
  }
}
