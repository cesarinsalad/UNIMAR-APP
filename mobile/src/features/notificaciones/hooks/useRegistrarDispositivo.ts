import { useCallback, useRef } from 'react';

import { ApiError } from '@/shared/api/axios';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { registrarDispositivo } from '../api/dispositivos.api';
import {
  obtenerExpoPushToken,
  plataformaActual,
} from '@/shared/notifications/pushToken';

export type EstadoRegistro = 'idle' | 'en_progreso' | 'ok' | 'error';

interface UseRegistrarDispositivo {
  registrar: () => Promise<EstadoRegistro>;
}

export function useRegistrarDispositivo(): UseRegistrarDispositivo {
  const enVuelo = useRef(false);

  const registrar = useCallback(async (): Promise<EstadoRegistro> => {
    if (enVuelo.current) return 'en_progreso';
    enVuelo.current = true;

    const sesion = useSesionStore.getState();
    try {
      const { token, motivo } = await obtenerExpoPushToken();
      if (!token) {
        if (motivo === 'permiso_denegado' || motivo === 'no_es_dispositivo_fisico') {
          sesion.setPushDeshabilitado(true);
        }
        return 'error';
      }

      const dispositivo = await registrarDispositivo({
        push_token: token,
        plataforma: plataformaActual(),
      });

      sesion.setDispositivo(dispositivo.id);
      sesion.setPushDeshabilitado(false);
      return 'ok';
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        sesion.setPushDeshabilitado(true);
        return 'error';
      }
      if (e instanceof ApiError && e.status === 401) {
        return 'error';
      }
      sesion.setPushDeshabilitado(false);
      return 'error';
    } finally {
      enVuelo.current = false;
    }
  }, []);

  return { registrar };
}