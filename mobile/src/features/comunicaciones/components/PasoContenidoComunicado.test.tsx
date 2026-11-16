import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, StyleSheet } from 'react-native';

import { colors } from '@/shared/ui/theme';

import { PasoContenidoComunicado } from './PasoContenidoComunicado';
import type { SesionEditor } from '../hooks/useHistorialEditor';
import type { PasoContenidoComunicadoProps } from './PasoContenidoComunicado.types';

const mockGetMarkdown = jest.fn<Promise<string>, []>();
const mockSetValue = jest.fn();
const mockSetSelection = jest.fn();

jest.mock('./EditorCuerpoEnriquecido', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const EditorCuerpoEnriquecido = React.forwardRef(
    (props: Record<string, unknown>, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({
        getMarkdown: mockGetMarkdown,
        setValue: mockSetValue,
        setSelection: mockSetSelection,
      }));
      return React.createElement('View', { ...props, testID: 'editor-visual' });
    },
  );
  return { EditorCuerpoEnriquecido };
});

// El sujeto es el paso, no la barra ni la hoja de enlace.
jest.mock('./BarraHerramientasEditor', () => ({
  BarraHerramientasEditor: () => null,
}));
// La hoja expone sus callbacks para poder disparar `onAplicar` en tests.
jest.mock('./HojaEnlaceComunicado', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    HojaEnlaceComunicado: (props: Record<string, unknown>) =>
      React.createElement('View', { ...props, testID: 'hoja-enlace' }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

/**
 * La verificación de round-trip usa requestAnimationFrame para dar un frame
 * al motor nativo; en Jest se ejecuta síncrono para poder razonar sobre los
 * reintentos sin timers reales.
 */
beforeAll(() => {
  jest
    .spyOn(global, 'requestAnimationFrame')
    .mockImplementation(
      ((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      }) as unknown as typeof requestAnimationFrame,
    );
  jest
    .spyOn(global, 'cancelAnimationFrame')
    .mockImplementation((() => undefined) as unknown as typeof cancelAnimationFrame);
});

function sesion(valor: string): SesionEditor {
  return {
    valor,
    seleccion: { start: 0, end: 0 },
    revision: 0,
    puedeDeshacer: false,
    puedeRehacer: false,
    registrar: jest.fn(),
    registrarSeleccion: jest.fn(),
    deshacer: () => null,
    rehacer: () => null,
  };
}

function crear(
  overrides: Partial<PasoContenidoComunicadoProps> = {},
): ReactTestRenderer {
  const props: PasoContenidoComunicadoProps = {
    titulo: 'Título',
    sesion: sesion('Texto inicial'),
    onCambiarTitulo: jest.fn(),
    editable: true,
    ...overrides,
  };
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = create(<PasoContenidoComunicado {...props} />);
  });
  return arbol;
}

/** Drena microtareas (promesas del mock y efectos asíncronos). */
async function drenar(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function hayEditorVisual(arbol: ReactTestRenderer): boolean {
  return arbol.root.findAllByProps({ testID: 'editor-visual' }).length > 0;
}

function hayMarkdownCrudo(arbol: ReactTestRenderer): boolean {
  return (
    arbol.root.findAllByProps({
      accessibilityLabel: 'Cuerpo del comunicado en Markdown',
    }).length > 0
  );
}

describe('PasoContenidoComunicado (fallback automático de Markdown)', () => {
  beforeEach(() => {
    mockGetMarkdown.mockReset().mockResolvedValue('');
    mockSetValue.mockReset();
    mockSetSelection.mockReset();
  });

  it('un comunicado nuevo (vacío) abre en visual sin verificar nada', async () => {
    const arbol = crear({ sesion: sesion('') });
    await drenar();

    expect(mockGetMarkdown).not.toHaveBeenCalled();
    expect(hayEditorVisual(arbol)).toBe(true);
    expect(hayMarkdownCrudo(arbol)).toBe(false);
    act(() => arbol.unmount());
  });

  it('contenido que el editor puede redondear se queda en visual', async () => {
    mockGetMarkdown.mockResolvedValue('Texto inicial');
    const arbol = crear();
    await drenar();

    expect(mockGetMarkdown).toHaveBeenCalled();
    expect(hayEditorVisual(arbol)).toBe(true);
    expect(hayMarkdownCrudo(arbol)).toBe(false);
    act(() => arbol.unmount());
  });

  it('contenido no representable cae al Markdown crudo con aviso, sin botón de retorno', async () => {
    mockGetMarkdown.mockResolvedValue('| a | b |\n| - | - |');
    const arbol = crear();
    await drenar();

    expect(hayEditorVisual(arbol)).toBe(false);
    expect(hayMarkdownCrudo(arbol)).toBe(true);
    const aviso = arbol.root.findAll(
      (nodo) =>
        typeof nodo.props.children === 'string' &&
        nodo.props.children.includes('no perder contenido'),
    );
    expect(aviso.length).toBeGreaterThan(0);
    act(() => arbol.unmount());
  });

  it('un getMarkdown vacío frente a contenido no vacío no cae a Markdown (conservador)', async () => {
    const arbol = crear();
    await drenar();

    expect(mockGetMarkdown.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(hayEditorVisual(arbol)).toBe(true);
    expect(hayMarkdownCrudo(arbol)).toBe(false);
    act(() => arbol.unmount());
  });

  it('en nativo usa el contenedor con awareness de teclado, no la rama web', async () => {
    const arbol = crear();
    await drenar();

    expect(arbol.root.findAllByProps({ testID: 'scroll-web' })).toHaveLength(0);
    expect(arbol.root.findAllByProps({ testID: 'barra-web' })).toHaveLength(0);
    act(() => arbol.unmount());
  });

  it('el placeholder del título es corto y el label accesible sigue siendo descriptivo', async () => {
    const arbol = crear({ sesion: sesion('') });
    await drenar();

    const titulo = arbol.root.findAll(
      (nodo) => nodo.props.placeholder === 'Escribe el título',
    )[0]!;
    expect(titulo.props.accessibilityLabel).toBe('Título del comunicado');
    act(() => arbol.unmount());
  });

  it('un cambio de selección actualiza el caret sin reescribir el Markdown vigente', async () => {
    const registrar = jest.fn();
    const registrarSeleccion = jest.fn();
    const arbol = crear({
      sesion: { ...sesion(''), registrar, registrarSeleccion },
    });
    await drenar();

    act(() =>
      arbol.root
        .findAllByProps({ testID: 'editor-visual' })[0]!
        .props.onChangeSelection({ start: 3, end: 3 }),
    );

    expect(registrarSeleccion).toHaveBeenCalledWith({ start: 3, end: 3 });
    expect(registrar).not.toHaveBeenCalled();
    act(() => arbol.unmount());
  });

  it('título y cuerpo van en cajas con borde sutil y azul al enfocar', async () => {
    mockGetMarkdown.mockResolvedValue('Texto inicial');
    const arbol = crear();
    await drenar();

    const colorCaja = (testID: string) =>
      StyleSheet.flatten(
        arbol.root.findAllByProps({ testID })[0]!.props.style,
      ).borderColor;

    expect(colorCaja('caja-titulo')).toBe(colors.border.subtle);
    expect(colorCaja('caja-cuerpo')).toBe(colors.border.subtle);

    act(() =>
      arbol.root
        .findAllByProps({ accessibilityLabel: 'Título del comunicado' })[0]!
        .props.onFocus(),
    );
    expect(colorCaja('caja-titulo')).toBe(colors.brand.primary);

    act(() =>
      arbol.root.findAllByProps({ testID: 'editor-visual' })[0]!.props.onFocus(),
    );
    expect(colorCaja('caja-cuerpo')).toBe(colors.brand.primary);

    act(() =>
      arbol.root.findAllByProps({ testID: 'editor-visual' })[0]!.props.onBlur(),
    );
    expect(colorCaja('caja-cuerpo')).toBe(colors.border.subtle);
    act(() => arbol.unmount());
  });
});

describe('PasoContenidoComunicado (enlace en web)', () => {
  const OS_ORIGINAL = Platform.OS;

  beforeEach(() => {
    mockGetMarkdown.mockReset().mockResolvedValue('');
    mockSetValue.mockReset();
    mockSetSelection.mockReset();
    // El componente lee la plataforma en render (no en módulo) para que el
    // test pueda cambiarla.
    (Platform as { OS: string }).OS = 'web';
  });

  afterEach(() => {
    (Platform as { OS: string }).OS = OS_ORIGINAL;
  });

  it('aplica el enlace por transformación + setValue (la lib web no implementa setLink)', async () => {    mockGetMarkdown.mockResolvedValue('Texto inicial');
    const arbol = crear();
    await drenar();
    expect(hayEditorVisual(arbol)).toBe(true);

    act(() =>
      arbol.root
        .findByProps({ testID: 'hoja-enlace' })
        .props.onAplicar('https://unimar.edu.ve', 'texto'),
    );

    expect(mockSetValue).toHaveBeenCalledWith(
      '[texto](https://unimar.edu.ve)Texto inicial',
    );
    expect(mockSetSelection).toHaveBeenCalledWith(30, 30);
    act(() => arbol.unmount());
  });

  it('usa ScrollView plano y barra sin wrapper de teclado (keyboard-controller crashea en web)', async () => {
    const arbol = crear({ sesion: sesion('') });
    await drenar();

    expect(arbol.root.findAllByProps({ testID: 'scroll-web' }).length).toBeGreaterThan(0);
    expect(arbol.root.findAllByProps({ testID: 'barra-web' }).length).toBeGreaterThan(0);
    act(() => arbol.unmount());
  });
});
