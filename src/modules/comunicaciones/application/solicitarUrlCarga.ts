import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { IStorageService } from '../domain/ports';
import {
  construirStoragePath,
  MAX_TAMANO_ADJUNTO_BYTES,
  MIMES_PERMITIDOS,
  type MimePermitido,
} from '../domain/adjunto';
import { ESTADOS_EDITABLES } from '../domain/comunicado';

export interface SolicitarUrlCargaInput {
  comunicadoId: string;
  nombre: string;
  mimeType: string;
  tamano: number;
}

export interface UrlCargaResult {
  path: string;
  urlFirmada: string;
  token: string;
}

/**
 * Caso de uso: solicitar una URL firmada para subir un adjunto.
 *
 * No escribe metadatos en la base de datos: solo genera un path único y una
 * URL firmada. El cliente sube el archivo directo a Storage; luego llama a
 * RegistrarAdjunto para persistir los metadatos.
 */
export class SolicitarUrlCarga {
  constructor(
    private readonly comunicadoRepo: IComunicadoRepository,
    private readonly storage: IStorageService,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, input: SolicitarUrlCargaInput): Promise<UrlCargaResult> {
    if (claims.role === 'ESTUDIANTE') {
      throw new ForbiddenError('Solo comunicadores o administradores pueden adjuntar archivos');
    }

    if (!MIMES_PERMITIDOS.includes(input.mimeType as MimePermitido)) {
      throw new BadRequestError(
        `Tipo de archivo no permitido. Permitidos: ${MIMES_PERMITIDOS.join(', ')}`,
      );
    }

    if (input.tamano <= 0 || input.tamano > MAX_TAMANO_ADJUNTO_BYTES) {
      throw new BadRequestError(
        `Tamaño inválido. Máximo ${MAX_TAMANO_ADJUNTO_BYTES / (1024 * 1024)} MB`,
      );
    }

    return this.uow.runAs(claims, async (tx) => {
      const comunicado = await this.comunicadoRepo.buscarPorId(tx, input.comunicadoId);
      if (!comunicado) {
        throw new NotFoundError('Comunicado no encontrado');
      }

      if (!ESTADOS_EDITABLES.includes(comunicado.estado)) {
        throw new BadRequestError(
          `No se pueden adjuntar archivos a un comunicado en estado ${comunicado.estado}`,
        );
      }

      if (claims.role === 'COMUNICADOR' && comunicado.autorId !== claims.sub) {
        throw new ForbiddenError('No puedes adjuntar archivos a un comunicado que no creaste');
      }

      const path = construirStoragePath(comunicado.id, input.nombre);
      const { urlFirmada, token } = await this.storage.crearUrlCargaFirmada(path);

      return { path, urlFirmada, token };
    });
  }
}
