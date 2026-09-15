import { useQuery } from '@tanstack/react-query';

import { contarNoLeidas } from '../api/notificaciones.api';
import { CLAVES_NOTIFICACIONES } from './queryKeys';

export function useNoLeidas() {
  return useQuery({
    queryKey: CLAVES_NOTIFICACIONES.noLeidas,
    queryFn: contarNoLeidas,
  });
}