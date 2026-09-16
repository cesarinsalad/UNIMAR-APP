// Tests unitarios del caso de uso ListarDecanatos (sin base de datos ni red).
// El repositorio se sustituye por un mock estructural del puerto
// IDecanatoRepository + UnitOfWork, igual que en los demás casos de uso.

import { describe, expect, it } from 'vitest';
import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Claims } from '../../../shared/security/jwt';
import type { IDecanatoRepository } from '../domain/ports';
import { ListarDecanatos } from './listarDecanatos';

const fakeTx = {} as DbTx;

function makeUnitOfWork() {
  return {
    runAs: async <T>(claims: unknown, fn: (tx: DbTx) => Promise<T>) => {
      expect(claims).toBeDefined();
      return fn(fakeTx);
    },
  } as unknown as UnitOfWork;
}

function makeClaims(): Claims {
  return { sub: 'uuid-user', role: 'ESTUDIANTE', decanato_id: 5, nombre: 'User', exp: 0, iat: 0 };
}

describe('ListarDecanatos', () => {
  it('delega al repo y devuelve el catálogo completo ordenado', async () => {
    const catalogo = [
      { id: 1, nombre: 'Humanidades, Artes y Educación' },
      { id: 5, nombre: 'Ingeniería y Afines' },
    ];
    const repo: IDecanatoRepository = {
      listar: async () => catalogo,
    };
    const uc = new ListarDecanatos(repo, makeUnitOfWork());

    const resultado = await uc.ejecutar(makeClaims());

    expect(resultado).toEqual(catalogo);
  });

  it('catálogo vacío se retorna sin errores', async () => {
    const repo: IDecanatoRepository = { listar: async () => [] };
    const uc = new ListarDecanatos(repo, makeUnitOfWork());

    await expect(uc.ejecutar(makeClaims())).resolves.toEqual([]);
  });
});