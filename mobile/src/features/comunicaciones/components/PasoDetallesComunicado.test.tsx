import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { PasoDetallesComunicado } from './PasoDetallesComunicado';

// Skeleton usa useReducedMotion de Reanimated: en Jest no hay worklets.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: () => null },
  useReducedMotion: () => true,
}));

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

const DECANATOS = [
  { id: 1, nombre: 'Estudios Generales' },
  { id: 2, nombre: 'Ingeniería y Afines' },
];

function montar(
  overrides: Partial<Parameters<typeof PasoDetallesComunicado>[0]> = {},
): {
  arbol: ReactTestRenderer;
  props: Parameters<typeof PasoDetallesComunicado>[0];
} {
  const props: Parameters<typeof PasoDetallesComunicado>[0] = {
    portadaUri: null,
    onElegirPortada: jest.fn(),
    onQuitarPortada: jest.fn(),
    seleccion: [],
    seleccionEfectiva: [],
    rol: 'ADMIN',
    decanatoUsuario: null,
    decanatos: DECANATOS,
    onCambiarAudiencia: jest.fn(),
    adjuntosExistentes: [],
    adjuntosNuevos: [],
    adjuntosPorEliminar: [],
    onAgregarAdjuntos: jest.fn(),
    onQuitarAdjuntoNuevo: jest.fn(),
    onMarcarAdjuntoExistente: jest.fn(),
    onDesmarcarAdjuntoExistente: jest.fn(),
    editable: true,
    ...overrides,
  };
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = create(<PasoDetallesComunicado {...props} />);
  });
  return { arbol, props };
}

function contieneTexto(arbol: ReactTestRenderer, texto: string): boolean {
  return (
    arbol.root.findAll(
      (nodo) => typeof nodo.type === 'string' && nodo.props.children === texto,
    ).length > 0
  );
}

function boton(arbol: ReactTestRenderer, etiqueta: string) {
  return arbol.root.findByProps({
    accessibilityRole: 'button',
    accessibilityLabel: etiqueta,
  });
}

describe('PasoDetallesComunicado', () => {
  it('no renderiza la tarjeta ni el botón de Documento para volver al contenido', () => {
    const { arbol } = montar();

    expect(contieneTexto(arbol, 'Documento')).toBe(false);
    expect(
      arbol.root.findAll(
        (nodo) => nodo.props.accessibilityLabel === 'Editar el contenido del documento',
      ).length,
    ).toBe(0);
    act(() => arbol.unmount());
  });

  it('sin portada ofrece elegir imagen desde la galería', () => {
    const { arbol, props } = montar();

    expect(contieneTexto(arbol, 'Añadir una portada')).toBe(true);
    act(() => boton(arbol, 'Elegir imagen').props.onPress());
    expect(props.onElegirPortada).toHaveBeenCalledWith(false);
    act(() => arbol.unmount());
  });

  it('mientras la portada guardada firma su URL muestra el skeleton', () => {
    const { arbol } = montar({ portadaUri: null, cargandoPortada: true });

    expect(
      arbol.root.findAllByProps({ testID: 'portada-skeleton' }).length,
    ).toBeGreaterThan(0);
    expect(contieneTexto(arbol, 'Añadir una portada')).toBe(false);
    act(() => arbol.unmount());
  });

  it('con portada muestra las acciones de cambiar y quitar', () => {
    const { arbol, props } = montar({ portadaUri: 'file:///tmp/portada.jpg' });

    expect(contieneTexto(arbol, 'Añadir una portada')).toBe(false);
    act(() => boton(arbol, 'Quitar').props.onPress());
    expect(props.onQuitarPortada).toHaveBeenCalled();
    act(() => arbol.unmount());
  });

  it('ADMIN ve el selector de audiencia con el resumen actual', () => {
    const { arbol } = montar({ seleccionEfectiva: [] });

    expect(boton(arbol, 'Audiencia: Toda la universidad')).toBeDefined();
    act(() => arbol.unmount());
  });

  it('COMUNICADOR ve su decanato como audiencia fija', () => {
    const { arbol } = montar({
      rol: 'COMUNICADOR',
      decanatoUsuario: 2,
      decanatos: DECANATOS,
    });

    expect(contieneTexto(arbol, 'Solo tu decanato')).toBe(true);
    expect(contieneTexto(arbol, 'Se publicará en Ingeniería y Afines.')).toBe(true);
    expect(
      arbol.root.findAll(
        (nodo) => nodo.props.accessibilityLabel === 'Audiencia: Toda la universidad',
      ).length,
    ).toBe(0);
    act(() => arbol.unmount());
  });

  it('muestra los errores de audiencia y portada', () => {
    const { arbol } = montar({
      seleccion: null,
      seleccionEfectiva: null,
      errorAudiencia: 'Elige toda la universidad o al menos un decanato.',
      errorPortada: 'Permite el acceso a las fotos.',
    });

    expect(
      contieneTexto(arbol, 'Elige toda la universidad o al menos un decanato.'),
    ).toBe(true);
    expect(contieneTexto(arbol, 'Permite el acceso a las fotos.')).toBe(true);
    act(() => arbol.unmount());
  });

  it('incluye la sección de adjuntos con los archivos existentes', () => {
    const { arbol } = montar({
      adjuntosExistentes: [
        {
          id: 'adj-1',
          comunicadoId: 'com-1',
          storagePath: 'com-1/reglamento.pdf',
          nombre: 'reglamento.pdf',
          mimeType: 'application/pdf',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(contieneTexto(arbol, 'Adjuntos')).toBe(true);
    expect(contieneTexto(arbol, 'reglamento.pdf')).toBe(true);
    act(() => arbol.unmount());
  });
});
