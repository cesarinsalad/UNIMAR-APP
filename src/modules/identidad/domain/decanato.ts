/**
 * Entidad del dominio Identidad: decanato academico de la UNIMAR.
 *
 * Tabla de sistema (`decanatos`, migración identidad_base): catálogo casi
 * immutable que alimenta los seletores de audiencia del cliente móvil
 * (comunicados del Paso 3, eventos oficiales del Paso 4).
 */
export interface Decanato {
  id: number;
  nombre: string;
}