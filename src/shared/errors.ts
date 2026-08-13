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

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message, 'BAD_REQUEST');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(404, message, 'NOT_FOUND');
  }
}
