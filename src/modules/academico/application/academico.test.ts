// Tests unitarios de los casos de uso de Académico (sin base de datos ni red).
// Los colaboradores se sustituyen por mocks estructurales que cumplen las
// interfaces de puertos (IUniversityAcademicService + ICedulaResolver +
// UnitOfWork). fakeTx es un objeto vacío porque los repositorios mock
// nunca lo tocan.

import { describe, expect, it, vi } from 'vitest';
import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Claims } from '../../../shared/security/jwt';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type {
  HistorialMedicoDTO,
  MateriaDTO,
  PensumDTO,
  PerfilAcademico,
} from '../domain/dtos';
import type { IUniversityAcademicService } from '../domain/ports';
import type { ICedulaResolver, IUsuarioIdResolver } from '../../../shared/kernel/cedulaResolver';
import { ObtenerPerfil } from './obtenerPerfil';
import { ListarMaterias } from './listarMaterias';
import { ObtenerMateriaDetalle } from './obtenerMateriaDetalle';
import { ObtenerPensum } from './obtenerPensum';
import { ObtenerHistorialMedico } from './obtenerHistorialMedico';
import { PublicarNota } from './publicarNota';

const fakeTx = {} as DbTx;

function makeUnitOfWork() {
  return {
    run: async <T>(fn: (tx: DbTx) => Promise<T>) => fn(fakeTx),
    runAs: async <T>(_claims: Record<string, unknown>, fn: (tx: DbTx) => Promise<T>) => fn(fakeTx),
  } as unknown as UnitOfWork;
}

function makeClaims(sub = 'uuid-user'): Claims {
  return { sub, role: 'ESTUDIANTE', decanato_id: 5, nombre: 'User' };
}

function makePerfil(): PerfilAcademico {
  return {
    cedula: '20123456',
    nombre: 'Ana',
    carrera: 'Ing. de Sistemas',
    semestre: 7,
    promedio: 16.4,
    estatus: 'ACTIVO',
  };
}

function makeMaterias(): MateriaDTO[] {
  return [
    {
      id: 'mat-1',
      codigo: 'IS-701',
      nombre: 'Bases de Datos II',
      creditos: 4,
      es_actual: true,
      profesor: 'P',
      aula: 'A',
      horario: 'Lun 9-10',
      cortes: [],
    },
  ];
}

function makeHistorial(): HistorialMedicoDTO {
  return { cedula: '20123456', tipoSangre: 'O+', alergias: [], vacunas: [] };
}

function makePensum(): PensumDTO {
  return { carrera: 'IS', materias: [] };
}

function makeAcademicService(overrides: Partial<IUniversityAcademicService> = {}): {
  service: IUniversityAcademicService;
  calls: Record<string, unknown[]>;
} {
  const calls: Record<string, unknown[]> = {};
  const service: IUniversityAcademicService = {
    perfil: async (...args) => {
      calls.perfil = args;
      return overrides.perfil ? overrides.perfil(...args) : makePerfil();
    },
    materias: async (...args) => {
      calls.materias = args;
      return overrides.materias ? overrides.materias(...args) : makeMaterias();
    },
    materiaDetalle: async (...args) => {
      calls.materiaDetalle = args;
      return overrides.materiaDetalle
        ? overrides.materiaDetalle(...args)
        : makeMaterias()[0]!;
    },
    pensum: async (...args) => {
      calls.pensum = args;
      return overrides.pensum ? overrides.pensum(...args) : makePensum();
    },
    historialMedico: async (...args) => {
      calls.historialMedico = args;
      return overrides.historialMedico ? overrides.historialMedico(...args) : makeHistorial();
    },
  };
  return { service, calls };
}

function makeCedulaResolver(cedula = '20123456'): { resolver: ICedulaResolver; calls: unknown[][] } {
  const calls: unknown[][] = [];
  const resolver: ICedulaResolver = {
    obtenerCedula: async (...args) => {
      calls.push(args);
      return cedula;
    },
  };
  return { resolver, calls };
}

describe('ObtenerPerfil', () => {
  it('resuelve la cédula del usuario autenticado y llama al servicio académico', async () => {
    const { service, calls: svcCalls } = makeAcademicService();
    const { resolver, calls: resCalls } = makeCedulaResolver('20123456');
    const uc = new ObtenerPerfil(service, resolver, makeUnitOfWork());

    const result = await uc.ejecutar(makeClaims('uuid-ana'));
    expect(result.cedula).toBe('20123456');
    expect(resCalls[0]?.[1]).toBe('uuid-ana');
    expect((svcCalls.perfil as unknown[])[0]).toBe('20123456');
  });

  it('propaga NotFoundError si el usuario no existe localmente', async () => {
    const resolver: ICedulaResolver = {
      obtenerCedula: async () => {
        throw new NotFoundError('no existe');
      },
    };
    const { service } = makeAcademicService();
    const uc = new ObtenerPerfil(service, resolver, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims())).rejects.toThrow(NotFoundError);
  });
});

describe('ListarMaterias', () => {
  it('pasa el periodo al servicio si viene', async () => {
    const { service, calls } = makeAcademicService();
    const { resolver } = makeCedulaResolver();
    const uc = new ListarMaterias(service, resolver, makeUnitOfWork());
    const result = await uc.ejecutar(makeClaims(), { periodo: '2026-1' });
    expect(result).toHaveLength(1);
    expect((calls.materias as unknown[])[1]).toBe('2026-1');
  });

  it('sin periodo, pasa undefined al servicio', async () => {
    const { service, calls } = makeAcademicService();
    const { resolver } = makeCedulaResolver();
    const uc = new ListarMaterias(service, resolver, makeUnitOfWork());
    await uc.ejecutar(makeClaims(), {});
    expect((calls.materias as unknown[])[1]).toBeUndefined();
  });
});

describe('ObtenerMateriaDetalle', () => {
  it('pasa la materiaId al servicio', async () => {
    const { service, calls } = makeAcademicService();
    const { resolver } = makeCedulaResolver();
    const uc = new ObtenerMateriaDetalle(service, resolver, makeUnitOfWork());
    const result = await uc.ejecutar(makeClaims(), 'mat-1');
    expect(result.id).toBe('mat-1');
    expect((calls.materiaDetalle as unknown[])[1]).toBe('mat-1');
  });
});

describe('ObtenerPensum', () => {
  it('pasa carreraId al servicio', async () => {
    const { service, calls } = makeAcademicService();
    const { resolver } = makeCedulaResolver();
    const uc = new ObtenerPensum(service, resolver, makeUnitOfWork());
    const result = await uc.ejecutar(makeClaims(), 'IS');
    expect(result.carrera).toBe('IS');
    expect((calls.pensum as unknown[])[1]).toBe('IS');
  });
});

describe('ObtenerHistorialMedico', () => {
  it('consulta la cédula del propio usuario y devuelve el historial', async () => {
    const { service, calls } = makeAcademicService();
    const { resolver } = makeCedulaResolver('20123456');
    const uc = new ObtenerHistorialMedico(service, resolver, makeUnitOfWork());
    const result = await uc.ejecutar(makeClaims());
    expect(result.tipoSangre).toBe('O+');
    expect((calls.historialMedico as unknown[])[0]).toBe('20123456');
  });

  it('rechaza si el caller pide una cédula distinta a la suya', async () => {
    const { service } = makeAcademicService();
    const { resolver } = makeCedulaResolver('20123456');
    const uc = new ObtenerHistorialMedico(service, resolver, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims(), '99999999')).rejects.toThrow(ForbiddenError);
  });

  it('acepta si el caller pasa explícitamente su propia cédula', async () => {
    const { service } = makeAcademicService();
    const { resolver } = makeCedulaResolver('20123456');
    const uc = new ObtenerHistorialMedico(service, resolver, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims(), '20123456')).resolves.toBeDefined();
  });
});

describe('PublicarNota', () => {
  function makeUsuarioIdResolver(usuarioId = 'uuid-est'): {
    resolver: IUsuarioIdResolver;
    obtenerSpy: ReturnType<typeof vi.fn>;
  } {
    const obtenerSpy = vi.fn(async () => usuarioId);
    const resolver: IUsuarioIdResolver = {
      obtenerUsuarioIdPorCedula: obtenerSpy as unknown as IUsuarioIdResolver['obtenerUsuarioIdPorCedula'],
    };
    return { resolver, obtenerSpy };
  }

  it('valida la nota: fuera de [0,20] lanza BadRequestError', async () => {
    const { resolver } = makeUsuarioIdResolver();
    const uc = new PublicarNota(resolver, makeUnitOfWork());
    await expect(
      uc.ejecutar({
        materiaId: 'mat-1',
        materiaNombre: 'BD',
        cedulaEstudiante: '20123456',
        nota: 25,
        periodo: '2026-1',
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('resuelve cédula → UUID vía el puerto compartido', async () => {
    const { resolver, obtenerSpy } = makeUsuarioIdResolver('uuid-ana');
    const uc = new PublicarNota(resolver, makeUnitOfWork());
    const result = await uc.ejecutar({
      materiaId: 'mat-1',
      materiaNombre: 'BD',
      cedulaEstudiante: '20123456',
      nota: 18,
      periodo: '2026-1',
    });
    expect(obtenerSpy).toHaveBeenCalledOnce();
    expect(obtenerSpy.mock.calls[0]?.[1]).toBe('20123456');
    expect(result.usuarioId).toBe('uuid-ana');
  });

  it('propaga NotFoundError si la cédula no existe', async () => {
    const resolver: IUsuarioIdResolver = {
      obtenerUsuarioIdPorCedula: async () => {
        throw new NotFoundError('no existe');
      },
    };
    const uc = new PublicarNota(resolver, makeUnitOfWork());
    await expect(
      uc.ejecutar({
        materiaId: 'mat-1',
        materiaNombre: 'BD',
        cedulaEstudiante: '99999',
        nota: 10,
        periodo: '2026-1',
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
