import type {
  Request,
  RequestHandler,
  Response as ExpressResponse,
} from 'express';

/**
 * Gateway de Storage.
 *
 * Cuando `SUPABASE_PUBLIC_URL` apunta al propio BFF (dev con Supabase local),
 * las URLs firmadas que recibe el cliente viven bajo `/storage/v1`. Este
 * handler las reenvía al Storage real (`SUPABASE_URL` + `/storage/v1`), de
 * modo que el teléfono/navegador usa un único ingress alcanzable.
 *
 * En producción (Supabase Cloud) `SUPABASE_PUBLIC_URL` está vacío y el
 * gateway ni siquiera se monta: el cliente habla directo con Supabase.
 *
 * Semántica: proxy transparente. No reenvía `Authorization` (el BFF no presta
 * su service-role al cliente); la autorización es el `token` firmado que
 * Storage valida. La URL destino siempre cuelga de `supabaseUrl`, así que no
 * es un proxy abierto.
 */

const METODOS_PERMITIDOS = new Set(['GET', 'HEAD', 'PUT', 'POST']);

/** Cabeceras del cliente que Storage necesita para guardar el objeto. */
const CABECERAS_REENVIADAS = ['content-type', 'x-upsert', 'cache-control'] as const;

/** Cabeceras de Storage relevantes para el cliente (imagen, caché, ETag). */
const CABECERAS_DEVUELTAS = ['content-type', 'cache-control', 'etag'] as const;

export type FetchLike = (url: string, init: RequestInit) => Promise<globalThis.Response>;

export interface StorageGatewayDeps {
  /** URL base de Supabase, sin `/storage/v1` (p. ej. http://127.0.0.1:54321). */
  supabaseUrl: string;
  /** Inyectable en tests; por defecto el `fetch` global. */
  fetchImpl?: FetchLike;
}

function cabecerasReenviadas(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const nombre of CABECERAS_REENVIADAS) {
    const valor = req.headers[nombre];
    if (typeof valor === 'string' && valor.length > 0) headers[nombre] = valor;
  }
  return headers;
}

export function storageGateway(deps: StorageGatewayDeps): RequestHandler {
  const base = `${deps.supabaseUrl.replace(/\/+$/, '')}/storage/v1`;
  const fetchImpl: FetchLike = deps.fetchImpl ?? ((url, init) => fetch(url, init));

  async function reenviar(req: Request, res: ExpressResponse): Promise<void> {
    if (!METODOS_PERMITIDOS.has(req.method)) {
      res.setHeader('Allow', [...METODOS_PERMITIDOS].join(', '));
      res.status(405).json({
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido en el gateway de Storage' },
      });
      return;
    }

    // La capability es el token firmado; sin él, el gateway no reenvía nada.
    const token = req.query.token;
    if (typeof token !== 'string' || token.length === 0) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Falta el token de Storage' },
      });
      return;
    }

    const tieneCuerpo = req.method === 'PUT' || req.method === 'POST';
    const respuesta = await fetchImpl(`${base}${req.url}`, {
      method: req.method,
      headers: cabecerasReenviadas(req),
      body: tieneCuerpo ? new Uint8Array(req.body as Buffer) : undefined,
    });

    res.status(respuesta.status);
    for (const nombre of CABECERAS_DEVUELTAS) {
      const valor = respuesta.headers.get(nombre);
      if (valor !== null) res.setHeader(nombre, valor);
    }

    // HEAD/204/304 no llevan cuerpo; un GET de imagen/PDF sí.
    if (req.method === 'HEAD' || respuesta.status === 204 || respuesta.status === 304) {
      res.end();
      return;
    }
    const cuerpo = Buffer.from(await respuesta.arrayBuffer());
    res.send(cuerpo);
  }

  return (req, res, next) => {
    void reenviar(req, res).catch(next);
  };
}
