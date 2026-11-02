import { createElement, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

import { aIsoFecha, aIsoHora, fechaDesdeIso, horaDesdeIso } from '@/shared/lib/selector-fecha';

type TipoSelector = 'date' | 'time';

export interface SelectorWeb {
  /** Abre el picker nativo del navegador (debe correr dentro del onPress). */
  abrir: () => void;
  /**
   * Input invisible superpuesto a la caja (position absolute 100%×100%):
   * déjalo dentro de un contenedor con `position: relative` que envuelva
   * exactamente la caja táctil. `null` en nativo (allí manda el
   * DateTimePicker de la comunidad, que no tiene build web).
   */
  superpuesto: React.ReactNode;
}

const ESTILO_OVERLAY: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  border: 'none',
  padding: 0,
  margin: 0,
  pointerEvents: 'none',
};

/**
 * Selector de fecha/hora web — el sustituto del DateTimePicker de la
 * comunidad RN, que no compila para web (exporta null + warning). Renderiza
 * un `<input>` invisible de tipo date/time sobre la caja estilizada
 * existente; `abrir()` invoca `showPicker()` (exige gesto del usuario:
 * llámalo desde el `onPress`). Los cambios crudos del input se parsean y
 * se rechazan si son inválidos (`selector-fecha.ts`).
 * `fechaDesdeIso` conserva la hora de la base; `horaDesdeIso` su fecha —
 * la misma semántica del DateTimePicker nativo de la pantalla.
 */
export function useSelectorWeb(
  tipo: TipoSelector,
  valor: Date,
  onChange: (nueva: Date) => void,
): SelectorWeb {
  const refInput = useRef<HTMLInputElement | null>(null);

  const abrir = useCallback(() => {
    const entrada = refInput.current;
    if (!entrada) return;
    const susceptible = entrada as HTMLInputElement & { showPicker?: () => void };
    if (typeof susceptible.showPicker === 'function') {
      try {
        susceptible.showPicker();
        return;
      } catch {
        // Navegadores viejos (Safari < 16.4) o gesto caducado: cae a focus
        // (degradación benigna; el picker no aparece).
      }
    }
    entrada.focus();
  }, []);

  const superpuesto =
    Platform.OS === 'web'
      ? createElement('input', {
          type: tipo,
          value: tipo === 'date' ? aIsoFecha(valor) : aIsoHora(valor),
          onChange: (evento: { target: { value: string } }) => {
            const parseado =
              tipo === 'date'
                ? fechaDesdeIso(valor, evento.target.value)
                : horaDesdeIso(valor, evento.target.value);
            if (parseado) onChange(parseado);
          },
          style: ESTILO_OVERLAY,
          tabIndex: -1,
          'aria-label': tipo === 'date' ? 'Elegir fecha' : 'Elegir hora',
        })
      : null;

  return { abrir, superpuesto };
}
