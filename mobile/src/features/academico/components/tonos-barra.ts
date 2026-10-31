import { colors } from '@/shared/ui';

/**
 * Tonos de la barra lateral de las tarjetas de materia en curso: azul
 * sólida si la materia tiene clase hoy, azul sello al 30% si no (el
 * tinte pálido del card sobre blanco desaparece; esta intensidad se
 * nota sin gritar). Fuente única compartida por MateriaActualCard y la
 * leyenda — la simbología no puede divergir entre el muestrario y las
 * cards que explica.
 */
const ACTIVA = colors.brand.primary;
const INACTIVA = `${colors.brand.primary}4D`;

export function colorBarra(tieneClaseHoy: boolean): string {
  return tieneClaseHoy ? ACTIVA : INACTIVA;
}
