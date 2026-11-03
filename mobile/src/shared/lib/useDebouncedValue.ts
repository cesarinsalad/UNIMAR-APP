import { useEffect, useState } from 'react';

/**
 * Valor con retardo (debounce) para inputs de búsqueda: evita disparar
 * refetch/paginación server-side por cada tecla. `retardo` en ms (300 ≈
 * estándar UX; 200 se siente más ágil para búsqueda de títulos).
 */
export function useDebouncedValue<T>(valor: T, retardo = 300): T {
  const [aplazado, setAplazado] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setAplazado(valor), retardo);
    return () => clearTimeout(temporizador);
  }, [valor, retardo]);

  return aplazado;
}
