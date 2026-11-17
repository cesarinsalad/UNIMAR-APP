import type { Notificacion } from './types';
import {
  agruparPorDia,
  claveDia,
  etiquetaDia,
  horaNotificacion,
} from './grupos';

/** Lunes 16 de noviembre de 2026, 9:30 a. m. (hora local del runtime). */
const AHORA = new Date(2026, 10, 16, 9, 30);

function notificacion(id: string, fecha: Date): Notificacion {
  return {
    id,
    usuarioId: 'usuario-1',
    tipo: 'COMUNICADO_PUBLICADO',
    titulo: `Título ${id}`,
    cuerpo: 'Cuerpo',
    referenciaId: 'ref-1',
    leida: false,
    createdAt: fecha.toISOString(),
  };
}

describe('claveDia', () => {
  it('usa el día local, no el prefijo UTC del ISO', () => {
    const fecha = new Date(2026, 10, 12, 22, 6);
    expect(claveDia(fecha)).toBe('2026-11-12');
  });
});

describe('etiquetaDia', () => {
  it('nombra hoy y ayer', () => {
    expect(etiquetaDia(new Date(2026, 10, 16, 8, 0), AHORA)).toBe('Hoy');
    expect(etiquetaDia(new Date(2026, 10, 15, 23, 59), AHORA)).toBe('Ayer');
  });

  it('usa día + mes cortos dentro del mismo año', () => {
    expect(etiquetaDia(new Date(2026, 10, 12, 22, 6), AHORA)).toBe('Jue 12 nov');
  });

  it('añade el año cuando la fecha es de otro año', () => {
    expect(etiquetaDia(new Date(2025, 11, 31, 10, 0), AHORA)).toBe('31 dic 2025');
  });

  it('cubre el cambio de mes hacia atrás en "Ayer"', () => {
    const primeroDeMes = new Date(2026, 11, 1, 10, 0);
    expect(etiquetaDia(new Date(2026, 10, 30, 21, 0), primeroDeMes)).toBe('Ayer');
  });
});

describe('agruparPorDia', () => {
  it('agrupa por día conservando el orden del wire', () => {
    const grupos = agruparPorDia(
      [
        notificacion('a', new Date(2026, 10, 16, 10, 6)),
        notificacion('b', new Date(2026, 10, 16, 9, 0)),
        notificacion('c', new Date(2026, 10, 15, 23, 18)),
        notificacion('d', new Date(2026, 10, 12, 20, 56)),
        notificacion('e', new Date(2026, 10, 12, 18, 0)),
      ],
      AHORA,
    );

    expect(grupos.map((g) => g.clave)).toEqual([
      '2026-11-16',
      '2026-11-15',
      '2026-11-12',
    ]);
    expect(grupos.map((g) => g.etiqueta)).toEqual([
      'Hoy',
      'Ayer',
      'Jue 12 nov',
    ]);
    expect(grupos.map((g) => g.notificaciones.map((n) => n.id))).toEqual([
      ['a', 'b'],
      ['c'],
      ['d', 'e'],
    ]);
  });

  it('no reordena ni fusiona días no contiguos', () => {
    const grupos = agruparPorDia(
      [
        notificacion('a', new Date(2026, 10, 16, 10, 0)),
        notificacion('b', new Date(2026, 10, 14, 10, 0)),
        notificacion('c', new Date(2026, 10, 16, 9, 0)),
      ],
      AHORA,
    );

    // El día repetido se suma a su primer grupo, no se crea otro al final.
    expect(grupos).toHaveLength(2);
    expect(grupos[0]?.notificaciones.map((n) => n.id)).toEqual(['a', 'c']);
  });

  it('manda los ISO inválidos a un grupo de cierre', () => {
    const grupos = agruparPorDia(
      [
        notificacion('a', new Date(2026, 10, 16, 10, 0)),
        { ...notificacion('b', new Date()), createdAt: 'no-es-fecha' },
      ],
      AHORA,
    );

    expect(grupos.map((g) => g.clave)).toEqual(['2026-11-16', 'sin-fecha']);
    expect(grupos[1]?.etiqueta).toBe('Sin fecha');
  });
});

describe('horaNotificacion', () => {
  it('formatea la hora local', () => {
    const hora = horaNotificacion(new Date(2026, 10, 12, 22, 6).toISOString());
    expect(hora).toMatch(/10:06/);
    expect(hora).toMatch(/p\.\s?m\./);
  });

  it('devuelve vacío con un ISO inválido', () => {
    expect(horaNotificacion('no-es-fecha')).toBe('');
  });
});
