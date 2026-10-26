import { useEffect, useState } from 'react';

/** Valor con debounce: útil para barras de búsqueda que golpean al BFF. */
export function useDebounced<T>(valor: T, ms = 300): T {
  const [valorDiferido, setValorDiferido] = useState(valor);
  useEffect(() => {
    const timer = setTimeout(() => setValorDiferido(valor), ms);
    return () => clearTimeout(timer);
  }, [valor, ms]);
  return valorDiferido;
}
