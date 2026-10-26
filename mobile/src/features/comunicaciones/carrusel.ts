import type { Comunicado } from './types';

/**
 * Selección de noticias para el carrusel de la tab Noticias: prioriza lo
 * cercano al usuario (decanato del claim), luego lo visual (portada) y
 * finalmente lo fresco (publicado/creado más reciente). Orden DROP-IN del
 * heurístico anterior "la primera con imagen": mismo input, salida rankeada.
 */
export function seleccionarParaCarrusel(
  comunicados: Comunicado[],
  decanatoUsuarioId: number | null,
  max = 5,
): Comunicado[] {
  const fechaDe = (c: Comunicado) =>
    new Date(c.publicadoAt ?? c.createdAt).getTime();

  const ordenados = [...comunicados].sort((a, b) => {
    const deUsuario = decanatoUsuarioId !== null && a.decanatoIds.includes(decanatoUsuarioId);
    const deUsuarioB = decanatoUsuarioId !== null && b.decanatoIds.includes(decanatoUsuarioId);
    if (deUsuario !== deUsuarioB) return deUsuario ? -1 : 1;
    const conPortada = a.imagenPath !== null;
    const conPortadaB = b.imagenPath !== null;
    if (conPortada !== conPortadaB) return conPortada ? -1 : 1;
    return fechaDe(b) - fechaDe(a);
  });

  return ordenados.slice(0, max);
}
