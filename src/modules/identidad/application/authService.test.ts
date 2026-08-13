// Tests unitarios de AuthService (sin base de datos ni red).
// Los cuatro colaboradores se sustituyen por mocks estructurales que cumplen
// sus interfaces: esto aísla la lógica pura del caso de uso — "qué recibe, qué
// delega a quién y qué devuelve" — y no depende de que haya un Supabase arriba.
// fakeTx es un objeto vacío porque el repositorio mock nunca lo toca realmente.

import { describe, expect, it } from 'vitest';
import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { IUniversityAuthService, IUsuarioRepository, Usuario } from '../domain/ports';
import type { IJwtService, Claims } from '../../../shared/security/jwt';
import { AuthService } from './authService';
import { UnauthorizedError } from '../../../shared/errors';

const fakeTx = {} as DbTx;

function makeUnitOfWork() {
  return {
    run: async <T>(fn: (tx: DbTx) => Promise<T>) => fn(fakeTx),
  } as unknown as UnitOfWork;
}

describe('AuthService', () => {
  it('login exitoso valida, upsertea y emite un JWT con los claims correctos', async () => {
    const credentials = { email: 'ana.estudiante@unimar.edu.ve', password: 'unimar123' };
    const perfil = {
      cedula: '20123456',
      nombre: 'Ana Estudiante',
      decanatoId: 5,
      email: credentials.email,
    };
    const usuario = {
      id: 'uuid-ana',
      cedula: perfil.cedula,
      nombre: perfil.nombre,
      rolNombre: 'ESTUDIANTE',
      decanatoId: 5,
      preferencias: {},
    };

    const universityAuth: IUniversityAuthService = {
      validateCredentials: async () => perfil,
    };

    const jwt: IJwtService = {
      sign: (claims: Claims) => `token-con-${claims.sub}`,
      verify: () => {
        throw new Error('no se usa');
      },
    };

    const usuarios: IUsuarioRepository = {
      upsertDesdePerfil: async () => usuario,
    };

    const authService = new AuthService(universityAuth, usuarios, jwt, makeUnitOfWork());
    const result = await authService.login(credentials);

    expect(result.token).toBe('token-con-uuid-ana');
    expect(result.usuario.rol).toBe('ESTUDIANTE');
    expect(result.usuario.decanato_id).toBe(5);
  });

  it('propaga UnauthorizedError cuando la universidad rechaza credenciales', async () => {
    const universityAuth: IUniversityAuthService = {
      validateCredentials: async () => {
        throw new UnauthorizedError('Credenciales inválidas');
      },
    };

    const jwt: IJwtService = { sign: () => 'x', verify: () => ({}) as Claims };
    const usuarios: IUsuarioRepository = { upsertDesdePerfil: async () => ({}) as Usuario };

    const authService = new AuthService(universityAuth, usuarios, jwt, makeUnitOfWork());

    await expect(
      authService.login({ email: 'x@unimar.edu.ve', password: 'bad' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('el JWT hereda el rol del usuario sin sobrescribirlo (preservación por upsert)', async () => {
    const perfil = { cedula: '17420667', nombre: 'Flavio Rosales', decanatoId: 5, email: 'f@u.ve' };
    const usuarioComunicador = {
      id: 'uuid-flavio',
      cedula: perfil.cedula,
      nombre: perfil.nombre,
      rolNombre: 'COMUNICADOR',
      decanatoId: 5,
      preferencias: {},
    };

    const universityAuth: IUniversityAuthService = {
      validateCredentials: async () => perfil,
    };

    const signedClaims: Claims[] = [];
    const jwt: IJwtService = {
      sign: (c: Claims) => {
        signedClaims.push(c);
        return 'token';
      },
      verify: () => ({}) as Claims,
    };

    const usuarios: IUsuarioRepository = {
      upsertDesdePerfil: async () => usuarioComunicador,
    };

    const authService = new AuthService(universityAuth, usuarios, jwt, makeUnitOfWork());
    await authService.login({ email: 'f@u.ve', password: 'unimar123' });

    expect(signedClaims[0]).toMatchObject({
      sub: 'uuid-flavio',
      role: 'COMUNICADOR',
      decanato_id: 5,
    });
  });
});
