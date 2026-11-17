import { StyleSheet } from 'react-native';
import { act, create } from 'react-test-renderer';

import { colors, fontFamily } from '@/shared/ui/theme';

import { CabeceraAsistente } from './CabeceraAsistente';

jest.mock('phosphor-react-native', () => ({
  ArrowLeftIcon: () => null,
}));

function montar(overrides: Partial<Parameters<typeof CabeceraAsistente>[0]> = {}) {
  const props: Parameters<typeof CabeceraAsistente>[0] = {
    paso: 1,
    onAtras: jest.fn(),
    onSiguiente: jest.fn(),
    ...overrides,
  };
  let arbol!: ReturnType<typeof create>;
  act(() => {
    arbol = create(<CabeceraAsistente {...props} />);
  });
  return { arbol, props };
}

function textoNativo(arbol: ReturnType<typeof create>, contenido: string) {
  return arbol.root.find(
    (nodo) => typeof nodo.type === 'string' && nodo.props.children === contenido,
  );
}

function boton(arbol: ReturnType<typeof create>, etiqueta: string) {
  return arbol.root.findByProps({
    accessibilityRole: 'button',
    accessibilityLabel: etiqueta,
  });
}

function botonesNativos(arbol: ReturnType<typeof create>) {
  return arbol.root.findAll(
    (nodo) =>
      typeof nodo.type === 'string' && nodo.props.accessibilityRole === 'button',
  );
}

describe('CabeceraAsistente', () => {
  it('muestra el título contextual y los tres pasos encima de las barras', () => {
    const { arbol } = montar({ paso: 1 });
    expect(textoNativo(arbol, 'Nuevo comunicado')).toBeDefined();
    expect(textoNativo(arbol, 'Contenido')).toBeDefined();
    expect(textoNativo(arbol, 'Detalles')).toBeDefined();
    expect(textoNativo(arbol, 'Revisión')).toBeDefined();
    act(() => arbol.unmount());

    const edicion = montar({ paso: 2, titulo: 'Editar comunicado' });
    expect(textoNativo(edicion.arbol, 'Editar comunicado')).toBeDefined();
    act(() => edicion.arbol.unmount());
  });

  it('separa título, botones de navegación y pasos en tres filas distintas', () => {
    const { arbol } = montar({ paso: 1, titulo: 'Editar comunicado' });
    const raiz = arbol.root.find(
      (nodo) =>
        typeof nodo.type === 'string' &&
        nodo.props.accessibilityLabel === 'Paso 1 de 3: Contenido',
    );
    const filas = raiz.children.filter(
      (hijo): hijo is Exclude<typeof hijo, string> => typeof hijo !== 'string',
    );
    expect(filas).toHaveLength(3);

    const [filaTitulo, filaAcciones, filaPasos] = filas;
    expect(filaTitulo?.findAll((n) => n.props.children === 'Editar comunicado')).not.toHaveLength(0);
    expect(filaTitulo?.findAll((n) => n.props.accessibilityRole === 'button')).toHaveLength(0);

    expect(
      filaAcciones
        ?.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button')
        .map((n) => n.props.accessibilityLabel),
    ).toEqual(['Volver', 'Siguiente']);
    expect(filaAcciones?.findAll((n) => n.props.children === 'Editar comunicado')).toHaveLength(0);

    expect(filaPasos?.findAll((n) => n.props.children === 'Contenido')).not.toHaveLength(0);
    expect(filaPasos?.findAll((n) => n.props.children === 'Detalles')).not.toHaveLength(0);
    expect(filaPasos?.findAll((n) => n.props.children === 'Revisión')).not.toHaveLength(0);
    expect(filaPasos?.findAll((n) => n.props.accessibilityRole === 'button')).toHaveLength(0);

    act(() => arbol.unmount());
  });

  it.each([
    {
      paso: 1 as const,
      activo: 'Contenido',
      completados: [] as string[],
      futuros: ['Detalles', 'Revisión'],
    },
    {
      paso: 2 as const,
      activo: 'Detalles',
      completados: ['Contenido'],
      futuros: ['Revisión'],
    },
    {
      paso: 3 as const,
      activo: 'Revisión',
      completados: ['Contenido', 'Detalles'],
      futuros: [] as string[],
    },
  ])('destaca únicamente el paso $paso ($activo), pinta los completados en azul suave y anuncia accesibilidad', ({ paso, activo, completados, futuros }) => {
    const { arbol } = montar({ paso });

    const raiz = arbol.root.findByProps({
      accessibilityLabel: `Paso ${paso} de 3: ${activo}`,
    });
    expect(raiz).toBeDefined();

    const estiloActivo = StyleSheet.flatten(textoNativo(arbol, activo).props.style);
    expect(estiloActivo.color).toBe(colors.brand.primary);
    expect(estiloActivo.fontFamily).toBe(fontFamily.semibold);

    for (const etiqueta of completados) {
      const estiloCompletado = StyleSheet.flatten(textoNativo(arbol, etiqueta).props.style);
      expect(estiloCompletado.color).toBe(colors.brand.primarySoft);
      expect(estiloCompletado.fontFamily).toBe(fontFamily.regular);
    }

    for (const etiqueta of futuros) {
      const estiloFuturo = StyleSheet.flatten(textoNativo(arbol, etiqueta).props.style);
      expect(estiloFuturo.color).toBe(colors.text.secondary);
      expect(estiloFuturo.fontFamily).toBe(fontFamily.regular);
    }

    act(() => arbol.unmount());
  });

  it('ejecuta onAtras y onSiguiente cuando están habilitados y respeta deshabilitados', () => {
    const { arbol, props } = montar({
      paso: 2,
      siguienteEtiqueta: 'Revisar',
    });

    act(() => boton(arbol, 'Volver').props.onPress());
    expect(props.onAtras).toHaveBeenCalledTimes(1);

    act(() => boton(arbol, 'Revisar').props.onPress());
    expect(props.onSiguiente).toHaveBeenCalledTimes(1);
    act(() => arbol.unmount());

    const bloqueado = montar({
      paso: 1,
      atrasDeshabilitado: true,
      siguienteDeshabilitado: true,
    });
    expect(boton(bloqueado.arbol, 'Volver').props.accessibilityState.disabled).toBe(true);
    expect(boton(bloqueado.arbol, 'Siguiente').props.accessibilityState.disabled).toBe(true);
    act(() => bloqueado.arbol.unmount());
  });

  it('omite el botón siguiente cuando onSiguiente no se define y mantiene los pasos no interactivos', () => {
    const conSiguiente = montar({ paso: 1 });
    expect(
      botonesNativos(conSiguiente.arbol).map((n) => n.props.accessibilityLabel),
    ).toEqual(['Volver', 'Siguiente']);
    for (const etiqueta of ['Contenido', 'Detalles', 'Revisión']) {
      let actual = textoNativo(conSiguiente.arbol, etiqueta).parent;
      while (actual) {
        expect(actual.props.accessibilityRole).not.toBe('button');
        expect(actual.props.onPress).toBeUndefined();
        actual = actual.parent;
      }
    }
    act(() => conSiguiente.arbol.unmount());

    const pasoFinal = montar({ paso: 3, onSiguiente: undefined });
    expect(
      botonesNativos(pasoFinal.arbol).map((n) => n.props.accessibilityLabel),
    ).toEqual(['Volver']);
    act(() => pasoFinal.arbol.unmount());
  });
});
