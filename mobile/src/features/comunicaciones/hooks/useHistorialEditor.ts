import { useCallback, useRef, useState } from 'react';

import {
  crearHistorial,
  deshacerHistorial,
  entradaActual,
  puedeDeshacer,
  puedeRehacer,
  registrarEnHistorial,
  registrarSeleccionEnHistorial,
  rehacerHistorial,
  type EstadoHistorial,
  type SeleccionEditor,
  type TipoEntradaHistorial,
} from '../components/editorHistorial';

export interface SesionEditor {
  valor: string;
  seleccion: SeleccionEditor;
  revision: number;
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  registrar: (
    markdown: string,
    seleccion: SeleccionEditor,
    tipo?: Exclude<TipoEntradaHistorial, 'inicial'>,
  ) => void;
  /** Solo mueve el caret del snapshot; nunca cambia el documento. */
  registrarSeleccion: (seleccion: SeleccionEditor) => void;
  deshacer: () => SeleccionEditor | null;
  rehacer: () => SeleccionEditor | null;
}

/**
 * Sesión de edición que sobrevive a la navegación entre pasos del asistente.
 * `revision` permite que el editor nativo (no controlado) aplique un
 * snapshot de undo/redo mediante `setValue` + `setSelection`.
 */
export function useHistorialEditor(
  markdownInicial: string,
  seleccionInicial: SeleccionEditor = { start: 0, end: 0 },
): SesionEditor {
  const [estado, setEstado] = useState<EstadoHistorial>(() =>
    crearHistorial(markdownInicial, seleccionInicial),
  );
  const estadoRef = useRef(estado);
  const [revision, setRevision] = useState(0);

  const guardarEstado = useCallback((siguiente: EstadoHistorial) => {
    if (siguiente === estadoRef.current) return false;
    estadoRef.current = siguiente;
    setEstado(siguiente);
    return true;
  }, []);

  const registrar = useCallback(
    (
      markdown: string,
      seleccion: SeleccionEditor,
      tipo: Exclude<TipoEntradaHistorial, 'inicial'> = 'texto',
    ) => {
      guardarEstado(
        registrarEnHistorial(estadoRef.current, markdown, seleccion, tipo),
      );
    },
    [guardarEstado],
  );

  const registrarSeleccion = useCallback(
    (seleccion: SeleccionEditor) => {
      guardarEstado(
        registrarSeleccionEnHistorial(estadoRef.current, seleccion),
      );
    },
    [guardarEstado],
  );

  const deshacer = useCallback(() => {
    const movimiento = deshacerHistorial(estadoRef.current);
    if (!movimiento) return null;
    if (!guardarEstado(movimiento.estado)) return null;
    setRevision((r) => r + 1);
    return movimiento.entrada.seleccion;
  }, [guardarEstado]);

  const rehacer = useCallback(() => {
    const movimiento = rehacerHistorial(estadoRef.current);
    if (!movimiento) return null;
    if (!guardarEstado(movimiento.estado)) return null;
    setRevision((r) => r + 1);
    return movimiento.entrada.seleccion;
  }, [guardarEstado]);

  const actual = entradaActual(estado);

  return {
    valor: actual.markdown,
    seleccion: actual.seleccion,
    revision,
    puedeDeshacer: puedeDeshacer(estado),
    puedeRehacer: puedeRehacer(estado),
    registrar,
    registrarSeleccion,
    deshacer,
    rehacer,
  };
}
