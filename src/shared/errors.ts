/**
 * Error base de la aplicación.
 *
 * Unifica el manejo de errores: cualquier excepción de la lógica de negocio se
 * lanza como AppError (o una subclase) con un código HTTP, un mensaje legible y
 * un código estable de máquina (`code`) que el cliente puede interpretar sin
 * depender del texto. El errorHandler del shared kernel lo convierte en la
 * respuesta JSON `{ error: { code, message } }`.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** 400: el request trae datos inválidos (p. ej. falló la validación Zod). */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message, 'BAD_REQUEST');
  }
}

/** 401: no hay autenticación válida (token ausente, inválido o expirado). */
export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(401, message, 'UNAUTHORIZED');
  }
}

/** 403: el usuario está autenticado pero su rol no alcanza para la acción (RBAC). */
export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(403, message, 'FORBIDDEN');
  }
}

/** 404: el recurso solicitado no existe o la ruta no está registrada. */
export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(404, message, 'NOT_FOUND');
  }
}
