import type { DbTx } from '../../../shared/kernel/db';
import type { Adjunto, CrearAdjuntoInput } from './adjunto';
import type { Comunicado, Estado } from './comunicado';

/**
 * Puerto de repositorio del componente Comunicaciones.
 *
 * Cada método recibe explícitamente la transacción (`DbTx`) porque toda
 * operación debe ejecutarse dentro del UnitOfWork del BFF, donde RLS evalúa
 * los claims del usuario autenticado.
 */
export interface IComunicadoRepository {
  crear(
    tx: DbTx,
    input: {
      titulo: string;
      cuerpo: string;
      autorId: string;
      programadoPara: string | null;
      expiraAt: string | null;
    },
  ): Promise<Comunicado>;

  agregarAudiencias(tx: DbTx, comunicadoId: string, decanatoIds: number[]): Promise<void>;

  buscarPorId(tx: DbTx, id: string): Promise<Comunicado | null>;

  listar(
    tx: DbTx,
    filtro: { estado?: Estado; limit: number; offset: number },
  ): Promise<Comunicado[]>;

  actualizar(
    tx: DbTx,
    id: string,
    input: {
      titulo?: string;
      cuerpo?: string;
      programadoPara?: string | null;
      expiraAt?: string | null;
      decanatoIds?: number[];
    },
  ): Promise<Comunicado | null>;

  transicionarEstado(
    tx: DbTx,
    id: string,
    input: {
      estado: Estado;
      aprobadoPor?: string | null;
      motivoRechazo?: string | null;
      publicadoAt?: Date | null;
      programadoPara?: string | null;
      expiraAt?: string | null;
    },
  ): Promise<Comunicado | null>;

  registrarLectura(tx: DbTx, comunicadoId: string, usuarioId: string): Promise<void>;

  contarLecturas(tx: DbTx, comunicadoId: string): Promise<number>;
}

/**
 * Puerto de almacenamiento (Storage). Es un adapter externo: el dominio no sabe
 * si detrás está Supabase, S3 u otro proveedor; solo pide URLs firmadas y
 * verificación de existencia.
 */
export interface IStorageService {
  crearUrlCargaFirmada(path: string): Promise<{ urlFirmada: string; token: string; path: string }>;
  crearUrlDescargaFirmada(path: string, expiraSegundos: number): Promise<string>;
  existeObjeto(path: string): Promise<boolean>;
  eliminarObjeto(path: string): Promise<void>;
}

/**
 * Puerto de repositorio para metadatos de adjuntos.
 */
export interface IAdjuntoRepository {
  crear(tx: DbTx, input: CrearAdjuntoInput): Promise<Adjunto>;
  listarPorComunicado(tx: DbTx, comunicadoId: string): Promise<Adjunto[]>;
  buscarPorId(tx: DbTx, id: string): Promise<Adjunto | null>;
  eliminar(tx: DbTx, id: string): Promise<boolean>;
}
