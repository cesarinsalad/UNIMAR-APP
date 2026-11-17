import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  BooksIcon,
  BuildingsIcon,
  ChartLineUpIcon,
  GearSixIcon,
  PaletteIcon,
  ScalesIcon,
} from 'phosphor-react-native';

import {
  SelectorAudiencia,
  iconoDeDecanato,
  type DecanatoAudiencia,
} from './SelectorAudiencia';

// La hoja nativa (TrueSheet) trae ESM que Jest no transforma: se sustituye
// por un contenedor que expone el render prop con `cerrar`.
jest.mock('@/shared/ui/HojaInferior', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    HojaInferior: ({
      children,
    }: {
      children?: (hoja: { cerrar: () => void }) => React.ReactNode;
    }) =>
      React.createElement(
        View,
        null,
        typeof children === 'function'
          ? children({ cerrar: () => undefined })
          : children,
      ),
  };
});

const DECANATOS: DecanatoAudiencia[] = [
  { id: 1, nombre: 'Estudios Generales' },
  { id: 2, nombre: 'Humanidades, Artes y Educación' },
  { id: 3, nombre: 'Ingeniería y Afines' },
];

function montar(
  overrides: Partial<Parameters<typeof SelectorAudiencia>[0]> = {},
): { arbol: ReactTestRenderer; onChange: jest.Mock } {
  const onChange = jest.fn();
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = create(
      <SelectorAudiencia
        seleccionEfectiva={[]}
        decanatos={DECANATOS}
        onChange={onChange}
        {...overrides}
      />,
    );
  });
  return { arbol, onChange };
}

function opcion(arbol: ReactTestRenderer, etiqueta: string) {
  return arbol.root.findByProps({
    accessibilityRole: 'checkbox',
    accessibilityLabel: etiqueta,
  });
}

function trigger(arbol: ReactTestRenderer, etiqueta: string) {
  return arbol.root.findByProps({
    accessibilityRole: 'button',
    accessibilityLabel: etiqueta,
  });
}

function contieneTexto(arbol: ReactTestRenderer, texto: string): boolean {
  return (
    arbol.root.findAll(
      (nodo) => typeof nodo.type === 'string' && nodo.props.children === texto,
    ).length > 0
  );
}

describe('SelectorAudiencia', () => {
  it('asigna un icono representativo a cada decanato y uno genérico al desconocido', () => {
    expect(iconoDeDecanato('Estudios Generales')).toBe(BooksIcon);
    expect(iconoDeDecanato('Humanidades, Artes y Educación')).toBe(PaletteIcon);
    expect(iconoDeDecanato('Ciencias Económicas y Sociales')).toBe(ChartLineUpIcon);
    expect(iconoDeDecanato('Ciencias Jurídicas y Políticas')).toBe(ScalesIcon);
    expect(iconoDeDecanato('INGENIERÍA Y AFINES')).toBe(GearSixIcon);
    expect(iconoDeDecanato('Decanato de Posgrado')).toBe(BuildingsIcon);
  });

  it('sin elegir muestra el placeholder y ninguna opción marcada', () => {
    const { arbol } = montar({ seleccionEfectiva: null });

    expect(trigger(arbol, 'Audiencia: Elegir audiencia')).toBeDefined();
    expect(opcion(arbol, 'Toda la universidad').props.accessibilityState.checked).toBe(
      false,
    );
    expect(opcion(arbol, 'Estudios Generales').props.accessibilityState.checked).toBe(
      false,
    );
    act(() => arbol.unmount());
  });

  it('con lista vacía resume "Toda la universidad" y marca esa fila', () => {
    const { arbol } = montar({ seleccionEfectiva: [] });

    expect(trigger(arbol, 'Audiencia: Toda la universidad')).toBeDefined();
    expect(opcion(arbol, 'Toda la universidad').props.accessibilityState.checked).toBe(
      true,
    );
    act(() => arbol.unmount());
  });

  it('elegir "Toda la universidad" limpia los decanatos', () => {
    const { arbol, onChange } = montar({ seleccionEfectiva: [2] });

    act(() => opcion(arbol, 'Toda la universidad').props.onPress());

    expect(onChange).toHaveBeenCalledWith([]);
    act(() => arbol.unmount());
  });

  it('tocar un decanato inactivo lo agrega a la audiencia', () => {
    const { arbol, onChange } = montar({ seleccionEfectiva: [1] });

    act(() => opcion(arbol, 'Ingeniería y Afines').props.onPress());

    expect(onChange).toHaveBeenCalledWith([1, 3]);
    act(() => arbol.unmount());
  });

  it('tocar el último decanato activo deja el alcance global', () => {
    const { arbol, onChange } = montar({ seleccionEfectiva: [3] });

    act(() => opcion(arbol, 'Ingeniería y Afines').props.onPress());

    expect(onChange).toHaveBeenCalledWith([]);
    act(() => arbol.unmount());
  });

  it('con varios decanatos resume el conteo y lista sus nombres', () => {
    const { arbol } = montar({ seleccionEfectiva: [2, 3] });

    expect(trigger(arbol, 'Audiencia: 2 decanatos')).toBeDefined();
    expect(
      contieneTexto(
        arbol,
        'Humanidades, Artes y Educación · Ingeniería y Afines',
      ),
    ).toBe(true);
    act(() => arbol.unmount());
  });
});
