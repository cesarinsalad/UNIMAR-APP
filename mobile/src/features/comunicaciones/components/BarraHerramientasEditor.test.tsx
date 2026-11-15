import { act, create } from 'react-test-renderer';

import { BarraHerramientasEditor } from './BarraHerramientasEditor';

jest.mock('phosphor-react-native', () => {
  const Nulo = () => null;
  return {
    ArrowClockwiseIcon: Nulo,
    ArrowCounterClockwiseIcon: Nulo,
    CodeIcon: Nulo,
    DotsThreeIcon: Nulo,
    KeyboardIcon: Nulo,
    LinkSimpleIcon: Nulo,
    ListBulletsIcon: Nulo,
    ListNumbersIcon: Nulo,
    TextBIcon: Nulo,
    TextHOneIcon: Nulo,
    TextHThreeIcon: Nulo,
    TextHTwoIcon: Nulo,
    TextIndentIcon: Nulo,
    TextItalicIcon: Nulo,
    TextOutdentIcon: Nulo,
    TextStrikethroughIcon: Nulo,
  };
});

function montar(overrides: Partial<Parameters<typeof BarraHerramientasEditor>[0]> = {}) {
  const props = {
    modo: 'visual' as const,
    estados: {},
    puedeDeshacer: true,
    puedeRehacer: false,
    editable: true,
    onDeshacer: jest.fn(),
    onRehacer: jest.fn(),
    onComando: jest.fn(),
    onOcultarTeclado: jest.fn(),
    ...overrides,
  };
  let arbol!: ReturnType<typeof create>;
  act(() => {
    arbol = create(<BarraHerramientasEditor {...props} />);
  });
  return { arbol, props };
}

function boton(arbol: ReturnType<typeof create>, etiqueta: string) {
  return arbol.root.findByProps({
    accessibilityRole: 'button',
    accessibilityLabel: etiqueta,
  });
}

describe('BarraHerramientasEditor', () => {
  it('dispara comandos y deshacer; rehacer respeta el estado', () => {
    const { arbol, props } = montar({ estados: { negrita: true } });
    act(() => boton(arbol, 'Negrita').props.onPress());
    expect(props.onComando).toHaveBeenCalledWith('negrita');
    expect(boton(arbol, 'Negrita').props.accessibilityState.selected).toBe(true);

    act(() => boton(arbol, 'Deshacer').props.onPress());
    expect(props.onDeshacer).toHaveBeenCalled();

    expect(boton(arbol, 'Rehacer').props.accessibilityState.disabled).toBe(true);
    act(() => arbol.unmount());
  });

  it('despliega los comandos secundarios y el cambio de modo', () => {
    const { arbol, props } = montar();
    act(() => boton(arbol, 'Más opciones de formato').props.onPress());
    const markdown = boton(arbol, 'Editar Markdown');
    act(() => markdown.props.onPress());
    expect(props.onComando).toHaveBeenCalledWith('alternarMarkdown');
    act(() => arbol.unmount());
  });

  it('oculta el teclado y no ejecuta comandos si está deshabilitada', () => {
    const { arbol, props } = montar({ editable: false });
    act(() => boton(arbol, 'Negrita').props.onPress());
    expect(props.onComando).not.toHaveBeenCalled();
    act(() => boton(arbol, 'Ocultar teclado').props.onPress());
    expect(props.onOcultarTeclado).toHaveBeenCalled();
    act(() => arbol.unmount());
  });
});
