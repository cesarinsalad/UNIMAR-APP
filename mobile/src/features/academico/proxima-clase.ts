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
}

/** Número de minuto del "HH:MM". */
function minutosDeHora(hora: string, fechaBase: Date): Date {
  const partes = hora.split(':');
  const hh = partes[0] ?? '0';
  const mm = partes[1] ?? '0';
  const resultado = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate());
  resultado.setHours(Number(hh), Number(mm), 0, 0);
  return resultado;
}

/**
 * Ocurrencia de una materia más próxima a `ahora` para un día de la
 * semana de `fechaBase` (recorre hacia adelante en semanas). Devuelve
 * null si el día no es del horario de la materia o terminó ya para esa
 * ocurrencia.
 */
function ocurrenciaPosterior(
  materia: MateriaActualDTO,
  fechaBase: Date,
  ahora: Date,
): Date | null {
  const dias = materia.dias_semana;
  const horaInicio = materia.hora_inicio;
  if (!dias || dias.length === 0 || !horaInicio) return null;
  const horaFin = materia.hora_fin ?? horaInicio;

  for (let offsetDias = 0; offsetDias <= 7; offsetDias += 1) {
    const candidato = new Date(
      fechaBase.getFullYear(),
      fechaBase.getMonth(),
      fechaBase.getDate() + offsetDias,
    );
    // getDay() da 0=domingo…6=sábado; el contrato usa ISO-8601 1=lun…7=dom.
    const diaIso = candidato.getDay() === 0 ? 7 : candidato.getDay();
    if (!dias.includes(diaIso)) continue;

    const inicio = minutosDeHora(horaInicio, candidato);
    if (inicio.getTime() <= ahora.getTime()) continue;

    const fin = minutosDeHora(horaFin, candidato);
    if (fin.getTime() < inicio.getTime()) continue; // dato incoherente: descartado
    return inicio;
  }
  return null;
}

/**
 * Clase en curso para una materia: `ahora` dentro de la ventana
 * [inicio, fin) de una ocurrencia de hoy. Devuelve el inicio de esa
 * ventana o null si hoy no le toca clase o la ventana ya terminó.
 */
function ocurrenciaEnCurso(
  materia: MateriaActualDTO,
  ahora: Date,
): Date | null {
  const dias = materia.dias_semana;
  const horaInicio = materia.hora_inicio;
  if (!dias || dias.length === 0 || !horaInicio) return null;
  const horaFin = materia.hora_fin ?? horaInicio;

  const diaIso = ahora.getDay() === 0 ? 7 : ahora.getDay();
  if (!dias.includes(diaIso)) return null;

  const inicio = minutosDeHora(horaInicio, ahora);
  const fin = minutosDeHora(horaFin, ahora);
  const esVentana = ahora.getTime() >= inicio.getTime() && ahora.getTime() < fin.getTime();
  return esVentana ? inicio : null;
}

/**
 * Próxima clase para la card de Home.
 *
 * Reglas (decisión de diseño Fase 1c):
 *  - Solo materias con horario estructurado (`dias_semana` + `hora_inicio`).
 *  - Prioridad 1: clase EN CURSO (gana siempre; tie → primera del array).
 *  - Prioridad 2: ocurrencia futura más próxima; tie → primera del array.
 *  - Máximo alcance: 7 días hacia adelante (horario semanal repetitivo).
 */
export function proximaClase(
  materias: MateriaActualDTO[],
  ahora: Date,
): ProximaClase | null {
  // 1) En curso → la primera (en orden del array) cuentas.
  for (const materia of materias) {
    const inicio = ocurrenciaEnCurso(materia, ahora);
    if (inicio) {
      return { materia, inicio, minutosRestantes: 0, enCurso: true };
    }
  }

  // 2) Futuras: gana la más próxima (tie → posición del array).
  let ganadora: { materia: MateriaActualDTO; inicio: Date } | null = null;
  for (const materia of materias) {
    const inicio = ocurrenciaPosterior(materia, ahora, ahora);
    if (!inicio) continue;
    if (
      !ganadora ||
      inicio.getTime() < ganadora.inicio.getTime()
    ) {
      ganadora = { materia, inicio };
    }
  }
  if (!ganadora) return null;

  return {
    materia: ganadora.materia,
    inicio: ganadora.inicio,
    minutosRestantes: Math.round((ganadora.inicio.getTime() - ahora.getTime()) / 60_000),
    enCurso: false,
  };
}
