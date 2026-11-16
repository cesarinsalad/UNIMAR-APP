import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text, type TextStyle } from 'react-native';

import { fontFamily } from '@/shared/ui/theme';

import { CuerpoMarkdown } from './CuerpoMarkdown';

function render(cuerpo: string): ReactTestRenderer {
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = create(<CuerpoMarkdown cuerpo={cuerpo} />);
  });
  return arbol;
}

/** Estilo del nodo hoja que contiene el texto visible del fragmento. */
function estiloDeTexto(
  arbol: ReactTestRenderer,
  contenido: string,
): TextStyle {
  const nodo = arbol.root
    .findAllByType(Text)
    .find((texto) => texto.props.children === contenido);
  if (nodo === undefined) {
    throw new Error(`No se encontró el nodo de texto "${contenido}"`);
  }
  return StyleSheet.flatten(nodo.props.style) as TextStyle;
}

describe('CuerpoMarkdown (tipografía de énfasis en móvil)', () => {
  it('la negrita usa la familia semibold sin fontWeight (evita el fallback Android)', () => {
    const arbol = render('**negrita**');

    expect(estiloDeTexto(arbol, 'negrita')).toMatchObject({
      fontFamily: fontFamily.semibold,
      fontWeight: 'normal',
    });
    act(() => arbol.unmount());
  });

  it('la itálica usa el TTF itálico explícito y no fontStyle', () => {
    const arbol = render('*itálica*');

    expect(estiloDeTexto(arbol, 'itálica')).toMatchObject({
      fontFamily: fontFamily.regularItalic,
      fontStyle: 'normal',
    });
    act(() => arbol.unmount());
  });

  it('negrita + itálica usa la variante combinada', () => {
    const arbol = render('***ambas***');

    expect(estiloDeTexto(arbol, 'ambas')).toMatchObject({
      fontFamily: fontFamily.semiboldItalic,
      fontWeight: 'normal',
      fontStyle: 'normal',
    });
    act(() => arbol.unmount());
  });

  it('heading2 no mezcla familia personalizada con fontWeight', () => {
    const arbol = render('## Subtítulo');

    const estilo = estiloDeTexto(arbol, 'Subtítulo');
    expect(estilo.fontFamily).toBe(fontFamily.semibold);
    expect(estilo.fontWeight).toBeUndefined();
    act(() => arbol.unmount());
  });
});
