import { describe, expect, it } from 'vitest';
import { JwtService, type Claims } from './jwt';
import { UnauthorizedError } from '../errors';

describe('JwtService', () => {
  const secret = 'test-secret-de-32-caracteres!!';
  const service = new JwtService(secret, '1h');

  const claims: Claims = {
    sub: '7c0b2c29-0e63-41fe-8c93-86803889da52',
    role: 'ESTUDIANTE',
    decanato_id: 5,
    nombre: 'Ana Estudiante',
  };

  it('roundtrip: sign y verify preservan claims', () => {
    const token = service.sign(claims);
    const decoded = service.verify(token);

    expect(decoded.sub).toBe(claims.sub);
    expect(decoded.role).toBe(claims.role);
    expect(decoded.decanato_id).toBe(claims.decanato_id);
    expect(decoded.nombre).toBe(claims.nombre);
  });

  it('lanza UnauthorizedError si el token fue alterado', () => {
    const token = service.sign(claims);
    const tampered = token.slice(0, -5) + 'XXXXX';

    expect(() => service.verify(tampered)).toThrow(UnauthorizedError);
  });

  it('lanza UnauthorizedError con secreto incorrecto', () => {
    const token = service.sign(claims);
    const otherService = new JwtService('otro-secreto-distinto-para-tests!', '1h');

    expect(() => otherService.verify(token)).toThrow(UnauthorizedError);
  });

  it('lanza UnauthorizedError si el token expiró', () => {
    const expiredService = new JwtService(secret, '-1s');
    const token = expiredService.sign(claims);

    expect(() => service.verify(token)).toThrow(UnauthorizedError);
  });
});
