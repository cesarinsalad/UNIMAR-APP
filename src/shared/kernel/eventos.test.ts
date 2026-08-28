// Tests unitarios del EventBus (Shared Kernel).
// Verifican el contrato de dos fases: los handlers se ejecutan de forma
// secuencial dentro del tx, se recogen sus jobs post-commit, y un error de un
// handler aborta la publicación para que el caso de uso no haga COMMIT.

import { describe, expect, it } from 'vitest';
import type { DbTx } from './db';
import { EventBus } from './eventos';
import type { EventoComunicadoPublicado, EventoComunicadoRechazado } from './eventos';

const fakeTx = {} as DbTx;

function publicado(overrides: Partial<EventoComunicadoPublicado> = {}): EventoComunicadoPublicado {
  return {
    tipo: 'COMUNICADO_PUBLICADO',
    tx: fakeTx,
    comunicadoId: 'com-id',
    titulo: 'Titulo',
    autorId: 'autor-id',
    decanatoIds: [],
    ...overrides,
  };
}

function rechazado(overrides: Partial<EventoComunicadoRechazado> = {}): EventoComunicadoRechazado {
  return {
    tipo: 'COMUNICADO_RECHAZADO',
    tx: fakeTx,
    comunicadoId: 'com-id',
    titulo: 'Titulo',
    autorId: 'autor-id',
    motivo: 'no cumple',
    ...overrides,
  };
}

describe('EventBus', () => {
  it('sin suscriptores devuelve []', async () => {
    const bus = new EventBus();
    await expect(bus.publicar(publicado())).resolves.toEqual([]);
  });

  it('ejecuta el handler del tipo suscrito y recoge su job', async () => {
    const bus = new EventBus();
    const orden: string[] = [];
    let jobRan = false;

    bus.suscribir('COMUNICADO_PUBLICADO', async (evento) => {
      orden.push(`handler:${evento.comunicadoId}`);
      return async () => {
        jobRan = true;
      };
    });

    const jobs = await bus.publicar(publicado({ comunicadoId: 'com-x' }));
    expect(orden).toEqual(['handler:com-x']);
    expect(jobs).toHaveLength(1);

    await jobs[0]!();
    expect(jobRan).toBe(true);
  });

  it('no ejecuta handlers de otro tipo de evento', async () => {
    const bus = new EventBus();
    let llamado = false;
    bus.suscribir('COMUNICADO_RECHAZADO', async () => {
      llamado = true;
      return null;
    });

    await bus.publicar(publicado());
    expect(llamado).toBe(false);
  });

  it('un handler que devuelve null no agrega jobs', async () => {
    const bus = new EventBus();
    bus.suscribir('COMUNICADO_PUBLICADO', async () => null);
    await expect(bus.publicar(publicado())).resolves.toEqual([]);
  });

  it('ejecuta múltiples handlers en orden y acumula sus jobs', async () => {
    const bus = new EventBus();
    const orden: string[] = [];

    bus.suscribir('COMUNICADO_PUBLICADO', async () => {
      orden.push('primero');
      return async () => {};
    });
    bus.suscribir('COMUNICADO_PUBLICADO', async () => {
      orden.push('segundo');
      return async () => {};
    });

    const jobs = await bus.publicar(publicado());
    expect(orden).toEqual(['primero', 'segundo']);
    expect(jobs).toHaveLength(2);
  });

  it('propaga el error de un handler (aborta el COMMIT)', async () => {
    const bus = new EventBus();
    bus.suscribir('COMUNICADO_PUBLICADO', async () => {
      throw new Error('fallo en fan-out');
    });

    await expect(bus.publicar(publicado())).rejects.toThrow('fallo en fan-out');
  });

  it('tipifica el evento rechazado con motivo y excluye decanatoIds', async () => {
    const bus = new EventBus();
    let recibido: unknown;
    bus.suscribir('COMUNICADO_RECHAZADO', async (e) => {
      recibido = e;
      return null;
    });

    await bus.publicar(rechazado({ motivo: 'ajusta el título' }));
    expect(recibido).toMatchObject({ tipo: 'COMUNICADO_RECHAZADO', motivo: 'ajusta el título' });
  });
});
