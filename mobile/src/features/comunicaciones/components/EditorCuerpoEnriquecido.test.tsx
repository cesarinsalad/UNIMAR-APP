import { act, create } from 'react-test-renderer';
import { createRef } from 'react';
import type { ReactTestInstance } from 'react-test-renderer';

import type { EnrichedMarkdownTextInputInstance } from 'react-native-enriched-markdown';
import { ThemedButton } from '@/shared/ui/ThemedButton';
import { EditorCuerpoEnriquecido } from './EditorCuerpoEnriquecido';

// Los íconos SVG no aplican en el entorno de test.
jest.mock('phosphor-react-native', () => {
  const Nulo = () => null;
  return {
    TextBIcon: Nulo,
    TextItalicIcon: Nulo,
    TextUnderlineIcon: Nulo,
    TextHTwoIcon: Nulo,
    ListBulletsIcon: Nulo,
    ListNumbersIcon: Nulo,
    LinkSimpleIcon: Nulo,
  };
});

function montar(props: {
  valorInicial?: string;
  onChangeMarkdown?: (markdown: string) => void;
}) {
  const ref = createRef<EnrichedMarkdownTextInputInstance>();
  let arbol!: ReturnType<typeof create>;
  act(() => {
    arbol = create(
      <EditorCuerpoEnriquecido
        ref={ref}
        valorInicial={props.valorInicial ?? ''}
        onChangeMarkdown={props.onChangeMarkdown ?? (() => {})}
      />,
    );
  });
  return { ref, arbol };
}

/** Los botones de la barra son Pressable con accessibilityLabel/Role. */
function boton(arbol: { root: ReactTestInstance }, etiqueta: string) {
  return arbol.root.findByProps({
    accessibilityRole: 'button',
    accessibilityLabel: etiqueta,
  });
}

describe('EditorCuerpoEnriquecido', () => {
  it('emite markdown cuando el usuario teclea (onChangeMarkdown)', () => {
    const cambios: string[] = [];
    const { arbol } = montar({
      valorInicial: 'Hola',
      onChangeMarkdown: (md) => cambios.push(md),
    });
    const input = arbol.root.findByProps({ value: 'Hola' });
    act(() => input.props.onChangeText('Hola mundo'));
    expect(cambios).toEqual(['Hola mundo']);
  });

  it('la barra acciona el ref imperativo (toggleBold)', () => {
    const { ref, arbol } = montar({ valorInicial: '' });
    act(() => boton(arbol, 'Negrita').props.onPress());
    expect(ref.current?.toggleBold).toHaveBeenCalled();
  });

  it('título H2 y listas accionan los métodos de bloque del ref', () => {
    const { ref, arbol } = montar({ valorInicial: '' });
    act(() => boton(arbol, 'Título de sección').props.onPress());
    act(() => boton(arbol, 'Lista con viñetas').props.onPress());
    act(() => boton(arbol, 'Lista numerada').props.onPress());
    expect(ref.current?.toggleHeading).toHaveBeenCalledWith(2);
    expect(ref.current?.toggleUnorderedList).toHaveBeenCalled();
    expect(ref.current?.toggleOrderedList).toHaveBeenCalled();
  });

  it('sin selección inserta el enlace con insertLink(texto, url)', () => {
    const { ref, arbol } = montar({ valorInicial: '' });
    // Abre el panel (sin selección: onChangeSelection nunca disparó).
    act(() => boton(arbol, 'Enlace').props.onPress());
    const urlInput = arbol.root.findByProps({
      placeholder: 'https://unimar.edu.ve/…',
    });
    const textoInput = arbol.root.findByProps({
      placeholder: 'Texto del enlace',
    });
    act(() => urlInput.props.onChangeText('https://unimar.edu.ve/admisiones'));
    act(() => textoInput.props.onChangeText('Admisiones'));
    const aplicar = arbol.root.findAllByType(ThemedButton).find(
      (b) => b.props.title === 'Aplicar',
    ) as ReactTestInstance;
    act(() => aplicar.props.onPress());
    expect(ref.current?.insertLink).toHaveBeenCalledWith(
      'Admisiones',
      'https://unimar.edu.ve/admisiones',
    );
  });

  it('cancelar cierra el panel de enlace sin accionar el ref', () => {
    const { ref, arbol } = montar({ valorInicial: '' });
    act(() => boton(arbol, 'Enlace').props.onPress());
    const cancelar = arbol.root.findAllByType(ThemedButton).find(
      (b) => b.props.title === 'Cancelar',
    ) as ReactTestInstance;
    act(() => cancelar.props.onPress());
    expect(() =>
      arbol.root.findByProps({ placeholder: 'https://unimar.edu.ve/…' }),
    ).toThrow();
    expect(ref.current?.insertLink).not.toHaveBeenCalled();
    expect(ref.current?.setLink).not.toHaveBeenCalled();
  });

  it('el contador refleja la longitud del markdown en vivo', () => {
    const { arbol } = montar({ valorInicial: 'Hola' });
    const input = arbol.root.findByProps({ value: 'Hola' });
    act(() => input.props.onChangeText('Contenido del comunicado'));
    // 24 caracteres → contador en vivo del cabezal (más de un nodo
    // host lo replica; basta la presencia).
    expect(
      arbol.root.findAllByProps({ children: '24/5000' }).length,
    ).toBeGreaterThan(0);
  });
});
