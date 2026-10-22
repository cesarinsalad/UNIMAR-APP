import type { MateriaActualDTO } from './types';

/**
 * Resultado de la búsqueda de la próxima clase.
 *
 * `enCurso` distingue la clase cuya ventana [inicio, fin) contiene a
 * `ahora`: la card de Home la muestra como "En curso" (minutosRestantes
 * en 0) en vez de "EN X MIN". La clase en curso tiene prioridad total:
 * si hay varias, gana la primera del array.
 */
export interface ProximaClase {
  materia: MateriaActualDTO;
  /** Momento de la próxima ocurrencia (hoy o en un futuro). */
  inicio: Date;
  /** Math.round((inicio - ahora) / 60_000); 0 si enCurso. */
  minutosRestantes: number;
  /** `ahora` cae dentro de [inicioHoy, finHoy) de esta materia. */
  enCurso: boolean;
  /** Aula exacta donde ocurre esta clase (viene de la franja). */
  aula?: string;
}

/** Número de minuto del "HH:MM" → Date local con esa hora en `fechaBase`. */
export function minutosDeHora(hora: string, fechaBase: Date): Date {
  const partes = hora.split(':');
  const hh = partes[0] ?? '0';
  const mm = partes[1] ?? '0';
  const resultado = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate());
  resultado.setHours(Number(hh), Number(mm), 0, 0);
  return resultado;
}

/**
 * Ventana semanal de una materia: una franja exacta (`franjas`) o, en su
 * defecto, la compatibilidad con el horario plano (`dias_semana` +
 * `hora_inicio/fin`) replicado por día. El aula es por franja.
 */
export interface Ventana {
  dia: number;
  horaInicio: string;
  horaFin: string;
  aula?: string;
}

export function ventanasDeMateria(materia: MateriaActualDTO): Ventana[] {
  if (materia.franjas && materia.franjas.length > 0) {
    return materia.franjas.map((f) => ({
      dia: f.dia_semana,
      horaInicio: f.hora_inicio,
      horaFin: f.hora_fin,
      aula: f.aula,
    }));
  }
  const dias = materia.dias_semana;
  const horaInicio = materia.hora_inicio;
  if (!dias || dias.length === 0 || !horaInicio) return [];
  const horaFin = materia.hora_fin ?? horaInicio;
  return dias.map((dia) => ({ dia, horaInicio, horaFin, aula: materia.aula }));
}

/**
 * Ocurrencia de una ventana más próxima a `ahora` para el día indicado
 * (recorre hacia adelante en semanas). Devuelve null si la ocurrencia
 * ya empezó o el dato es incoherente.
 */
function ocurrenciaPosterior(
  ventana: Ventana,
  fechaBase: Date,
  ahora: Date,
): Date | null {
  for (let offsetDias = 0; offsetDias <= 7; offsetDias += 1) {
    const candidato = new Date(
      fechaBase.getFullYear(),
      fechaBase.getMonth(),
      fechaBase.getDate() + offsetDias,
    );
    // getDay() da 0=domingo…6=sábado; el contrato usa ISO-8601 1=lun…7=dom.
    const diaIso = candidato.getDay() === 0 ? 7 : candidato.getDay();
    if (diaIso !== ventana.dia) continue;

    const inicio = minutosDeHora(ventana.horaInicio, candidato);
    if (inicio.getTime() <= ahora.getTime()) continue;

    const fin = minutosDeHora(ventana.horaFin, candidato);
    if (fin.getTime() < inicio.getTime()) continue; // dato incoherente: descartado
    return inicio;
  }
  return null;
}

/**
 * Clase en curso para una ventana: `ahora` dentro de la ventana
 * [inicio, fin) de una ocurrencia de hoy. Devuelve el inicio de esa
 * ventana o null si hoy no le toca clase o la ventana ya terminó.
 */
function ocurrenciaEnCurso(ventana: Ventana, ahora: Date): Date | null {
  const diaIso = ahora.getDay() === 0 ? 7 : ahora.getDay();
  if (diaIso !== ventana.dia) return null;

  const inicio = minutosDeHora(ventana.horaInicio, ahora);
  const fin = minutosDeHora(ventana.horaFin, ahora);
  const esVentana = ahora.getTime() >= inicio.getTime() && ahora.getTime() < fin.getTime();
  return esVentana ? inicio : null;
}

/**
 * Próxima clase para la card de Home.
 *
 * Reglas (decisión de diseño Fase 1c):
 *  - Solo materias con horario estructurado: preferimos `franjas` (exactas
 *    por día/aula); sin ellas, `dias_semana` + `hora_inicio`.
 *  - Prioridad 1: clase EN CURSO (gana siempre; tie → primera del array).
 *  - Prioridad 2: ocurrencia futura más próxima; tie → posición previa.
 *  - Máximo alcance: 7 días hacia adelante (horario semanal repetitivo).
 */
export function proximaClase(
  materias: MateriaActualDTO[],
  ahora: Date,
): ProximaClase | null {
  // Ventanas aplanadas en orden estable: materia (orden del array) → franja.
  const ventanas = materias
    .map((materia) => ({ materia, ventanas: ventanasDeMateria(materia) }))
    .flatMap(({ materia, ventanas }) =>
      ventanas.map((ventana) => ({ materia, ventana })),
    );

  // 1) En curso → la primera en orden plano.
  for (const { materia, ventana } of ventanas) {
    const inicio = ocurrenciaEnCurso(ventana, ahora);
    if (inicio) {
      return {
        materia,
        inicio,
        minutosRestantes: 0,
        enCurso: true,
        aula: ventana.aula,
      };
    }
  }

  // 2) Futuras: gana la más próxima (tie → posición previa en el orden plano).
  let ganadora: { materia: MateriaActualDTO; ventana: Ventana; inicio: Date } | null = null;
  for (const { materia, ventana } of ventanas) {
    const inicio = ocurrenciaPosterior(ventana, ahora, ahora);
    if (!inicio) continue;
    if (
      !ganadora ||
      inicio.getTime() < ganadora.inicio.getTime()
    ) {
      ganadora = { materia, ventana, inicio };
    }
  }
  if (!ganadora) return null;

  return {
    materia: ganadora.materia,
    inicio: ganadora.inicio,
    minutosRestantes: Math.round((ganadora.inicio.getTime() - ahora.getTime()) / 60_000),
    enCurso: false,
    aula: ganadora.ventana.aula,
  };
}
