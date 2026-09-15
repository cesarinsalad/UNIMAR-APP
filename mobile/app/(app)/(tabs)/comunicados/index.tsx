import { ComunicadosList } from '@/features/comunicaciones/components/ComunicadosList';

/**
 * Tab de comunicados: feed público (PUBLICADO, visibilidad por audiencia
 * decidida por RLS). Bajo el header estándar del Tabs.
 */
export default function ComunicadosScreen() {
  return <ComunicadosList />;
}