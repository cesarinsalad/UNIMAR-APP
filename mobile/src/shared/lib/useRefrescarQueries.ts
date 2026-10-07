import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Pull-to-refresh por prefijos de query key: un hook para los estados
 * nativos de RefreshControl. Refetch en paralelo y sin infectar la UI con
 * errores (el mensaje de error vive en cada sección con su propio estado).
 */
export function useRefrescarQueries() {
  const queryClient = useQueryClient();
  const [refrescando, setRefrescando] = useState(false);

  const refrescar = useCallback(
    async (prefijos: readonly unknown[][]) => {
      setRefrescando(true);
      try {
        await Promise.all(
          prefijos.map((prefijo) => queryClient.refetchQueries({ queryKey: prefijo })),
        );
      } finally {
        setRefrescando(false);
      }
    },
    [queryClient],
  );

  return { refrescando, refrescar };
}
