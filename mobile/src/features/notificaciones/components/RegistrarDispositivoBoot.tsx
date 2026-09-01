import { useEffect } from 'react';

import { useRegistrarDispositivo } from '../hooks/useRegistrarDispositivo';
import { useSesionStore } from '@/features/identidad/store/sesion.store';

export function RegistrarDispositivoBoot(): null {
  const token = useSesionStore((s) => s.token);
  const dispositivoId = useSesionStore((s) => s.dispositivoId);
  const { registrar } = useRegistrarDispositivo();

  useEffect(() => {
    if (!token) return;
    if (dispositivoId) return;
    void registrar();
  }, [token, dispositivoId, registrar]);

  return null;
}