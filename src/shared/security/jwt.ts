import jwt, { type SignOptions } from 'jsonwebtoken';
import { UnauthorizedError } from '../errors';

/**
 * Claims que viajan en el JWT propio del BFF y que las políticas RLS leen
 * desde auth.jwt() (request.jwt.claims). sub es el UUID de usuarios.id.
 */
export interface Claims {
  sub: string;
  role: string;
  decanato_id: number | null;
  nombre: string;
}

export interface IJwtService {
  sign(claims: Claims): string;
  verify(token: string): Claims;
}

const ISSUER = 'unimarapp-bff';

export class JwtService implements IJwtService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(claims: Claims): string {
    const options: SignOptions = {
      expiresIn: this.expiresIn as SignOptions['expiresIn'],
      issuer: ISSUER,
    };
    return jwt.sign(
      { sub: claims.sub, role: claims.role, decanato_id: claims.decanato_id, nombre: claims.nombre },
      this.secret,
      options,
    );
  }

  verify(token: string): Claims {
    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, this.secret, { issuer: ISSUER }) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedError('Token inválido o expirado');
    }

    if (typeof decoded === 'string' || !decoded.sub || typeof decoded.role !== 'string') {
      throw new UnauthorizedError('Token inválido');
    }

    return {
      sub: String(decoded.sub),
      role: decoded.role,
      decanato_id: typeof decoded.decanato_id === 'number' ? decoded.decanato_id : null,
      nombre: typeof decoded.nombre === 'string' ? decoded.nombre : '',
    };
  }
}
