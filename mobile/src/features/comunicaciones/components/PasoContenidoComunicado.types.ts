import type { SesionEditor } from '../hooks/useHistorialEditor';

export interface PasoContenidoComunicadoProps {
  titulo: string;
  errorTitulo?: string;
  errorCuerpo?: string;
  sesion: SesionEditor;
  onCambiarTitulo: (titulo: string) => void;
  editable: boolean;
  limite?: number;
}
