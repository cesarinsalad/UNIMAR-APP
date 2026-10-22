import type { MateriaActualDTO } from './types';
import { minutosDeHora, ventanasDeMateria } from './proxima-clase';

/**
 * Estado de una clase respecto a `ahora` del día:
 * - `enCurso`: ahora ∈ [inicio, fin).
 * - `pasada`:  la ventana ya terminó (fin ≤ ahora).
 * - `futura`:  aún no empieza.
 * La agenda del Home atenua `pasada`, destaca `enCurso` (azul sello +
 * "Ahora") y pinta `futura` con la voz neutra del documento.
 */
export type EstadoClase = 'pasada' | 'enCurso' | 'futura';

export interface ClaseDia {
  materia: MateriaActualDTO;
  /** Inicio de la ventana de hoy. */
  inicio: Date;
  /** Fin de la ventana de hoy (siempre > inicio; ventanas incoherentes se descartan). */
  fin: Date;
  /** Aula exacta de la franja. */
  aula?: string;
  estado: EstadoClase;
}

/**
 * Todas las clases del día de `ahora`, en orden horario ascendente.
 *
 * Aplana las ventanas del horario estructurado (preferencia `franjas`,
 * fallback `dias_semana` + `hora_inicio/fin` — misma fuente que
 * `proximaClase`) quedándose solo con las del día ISO-8601 de `ahora`
 * (1=lun … 7=dom). Ventanas con `fin < inicio` se descartan como dato
 * incoherente.
 */
export function clasesDeDia(
  materias: MateriaActualDTO[],
  ahora: Date,
): ClaseDia[] {
  // getDay() da 0=domingo…6=sábado; el contrato usa ISO-8601 1=lun…7=dom.
  const diaIso = ahora.getDay() === 0 ? 7 : ahora.getDay();

  const clases: ClaseDia[] = [];
  for (const materia of materias) {
    for (const ventana of ventanasDeMateria(materia)) {
      if (ventana.dia !== diaIso) continue;
      const inicio = minutosDeHora(ventana.horaInicio, ahora);
      const fin = minutosDeHora(ventana.horaFin, ahora);
      if (fin.getTime() < inicio.getTime()) continue; // incoherente: descartado

      const ms = ahora.getTime();
      clases.push({
        materia,
        inicio,
        fin,
        aula: ventana.aula,
        estado:
          ms >= inicio.getTime() && ms < fin.getTime()
            ? 'enCurso'
            : ms >= fin.getTime()
              ? 'pasada'
              : 'futura',
      });
    }
  }

  return clases.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}
