import type { IPushService, PushMensaje } from '../domain/ports';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

type FetchFn = typeof fetch;

/**
 * Adapter del proveedor de push `mock`. Implementación por defecto: no hace red;
 * solo registra los mensajes y la cantidad. Su valor principal es mantener la
 * cobertura de pruebas y permitir el flujo E2E sin proveedores externos.
 */
export class MockPushService implements IPushService {
  async enviar(mensajes: PushMensaje[]): Promise<void> {
    if (mensajes.length === 0) return;
    console.log(
      `[push:mock] enviando ${mensajes.length} mensaje(s):`,
      mensajes.map((m) => ({ to: m.to, title: m.title })),
    );
  }
}

interface ExpoPushDeps {
  url?: string;
  fetchImpl?: FetchFn;
  chunkSize?: number;
}

/**
 * Adapter de Expo Push API.
 *
 * Estrategia best-effort:
 *   - Lotes de 100 mensajes por request (límite del proveedor).
 *   - HTTP no-2xx, errores de red y tickets `error` se loguean y NO lanzan:
 *     el push es post-COMMIT y un fallo no debe propagarse al cliente que
 *     originó la publicación.
 *   - `DeviceNotRegistered` se loguea pero no se borra el token en v1
 *     (acoplar el push a una conexión DB post-commit es innecesario en v1).
 *
 * El `fetchImpl` por defecto es `globalThis.fetch` (Node ≥ 18), y se puede
 * inyectar en tests para mockear la red sin tocar globals.
 */
export class ExpoPushService implements IPushService {
  private readonly url: string;
  private readonly fetchImpl: FetchFn;
  private readonly chunkSize: number;

  constructor(deps: ExpoPushDeps = {}) {
    this.url = deps.url ?? EXPO_PUSH_URL;
    this.fetchImpl = deps.fetchImpl ?? globalThis.fetch;
    this.chunkSize = deps.chunkSize ?? CHUNK_SIZE;
  }

  async enviar(mensajes: PushMensaje[]): Promise<void> {
    if (mensajes.length === 0) return;
    for (let i = 0; i < mensajes.length; i += this.chunkSize) {
      const lote = mensajes.slice(i, i + this.chunkSize);
      await this.enviarLote(lote);
    }
  }

  private async enviarLote(lote: PushMensaje[]): Promise<void> {
    const body = lote.map((m) => ({
      to: m.to,
      title: m.title,
      body: m.body,
      sound: m.sound ?? 'default',
      data: m.data ?? {},
    }));

    let res: Response;
    try {
      res = await this.fetchImpl(this.url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error('[push:expo] fallo de red al enviar lote de push:', err);
      return;
    }

    if (!res.ok) {
      console.error(
        `[push:expo] HTTP ${res.status} al enviar lote de push (${lote.length} mensajes)`,
      );
      return;
    }

    let payload: { data?: ExpoPushTicket[] };
    try {
      payload = (await res.json()) as { data?: ExpoPushTicket[] };
    } catch (err) {
      console.error('[push:expo] respuesta no-JSON del proveedor de push:', err);
      return;
    }

    const tickets = payload.data ?? [];
    tickets.forEach((ticket, idx) => {
      if (ticket.status === 'error') {
        console.warn(
          `[push:expo] ticket error (to=${lote[idx]?.to}): ${ticket.message ?? ''} ${ticket.details?.error ?? ''}`.trim(),
        );
      }
    });
  }
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}
