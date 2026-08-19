import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { Adjunto } from '../domain/adjunto';
import type { IComunicadoRepository, IAdjuntoRepository, IStorageService } from '../domain/ports';
import { MAX_TAMANO_ADJUNTO_BYTES, MIMES_PERMITIDOS, type MimePermitido } from '../domain/adjunto';
import { ESTADOS_EDITABLES } from '../domain/comunicado';

export interface RegistrarAdjuntoInput {
  comunicadoId: string;
  path: string;
  nombre: string;
  mimeType: string;
  tamano: number;
}

/**
 * Caso de uso: registrar los metadatos de un adjunto después de que el cliente
 * lo subió a Storage usando la URL firmada.
 *
 * Verifica que el objeto realmente existe en Storage antes de insertar la fila
 * (evita metadatos huérfanos) y que el path pertenece al comunicado indicado.
 */
export class RegistrarAdjunto {
  constructor(
    private readonly comunicadoRepo: IComunicadoRepository,
    private readonly adjuntoRepo: IAdjuntoRepository,
    private readonly storage: IStorageService,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, input: RegistrarAdjuntoInput): Promise<Adjunto> {
    if (claims.role === 'ESTUDIANTE') {
      throw new ForbiddenError('Solo comunicadores o administradores pueden registrar adjuntos');
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

    if (!input.path.startsWith(`${input.comunicadoId}/`)) {
      throw new BadRequestError('El path no corresponde al comunicado indicado');
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
        throw new ForbiddenError('No puedes registrar adjuntos en un comunicado que no creaste');
      }

      const existe = await this.storage.existeObjeto(input.path);
      if (!existe) {
        throw new BadRequestError(
          'El archivo no fue encontrado en Storage. Súbelo primero con la URL firmada.',
        );
      }

      const creado = await this.adjuntoRepo.crear(tx, {
        comunicadoId: input.comunicadoId,
        storagePath: input.path,
        nombre: input.nombre,
        mimeType: input.mimeType,
      });

      return creado;
    });
  }
}
