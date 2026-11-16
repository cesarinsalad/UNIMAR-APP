import { createRef } from 'react';
import { Platform } from 'react-native';
import { act, create } from 'react-test-renderer';

import type { EnrichedMarkdownTextInputInstance } from 'react-native-enriched-markdown';
import { EditorCuerpoEnriquecido } from './EditorCuerpoEnriquecido';

const mockEditorMethods = {
  focus: jest.fn(),
  blur: jest.fn(),
  measure: jest.fn(),
  measureInWindow: jest.fn(),
  measureLayout: jest.fn(),
  setValue: jest.fn(),
  setSelection: jest.fn(),
  toggleBold: jest.fn(),
  toggleItalic: jest.fn(),
  toggleUnderline: jest.fn(),
  toggleStrikethrough: jest.fn(),
  toggleSpoiler: jest.fn(),
  toggleHeading: jest.fn(),
  toggleUnorderedList: jest.fn(),
  toggleOrderedList: jest.fn(),
  indentList: jest.fn(),
  outdentList: jest.fn(),
  setLink: jest.fn(),
  insertLink: jest.fn(),
  insertText: jest.fn(),
  insertMention: jest.fn(),
  startMention: jest.fn(),
  removeLink: jest.fn(),
  copyToClipboard: jest.fn(),
  getMarkdown: jest.fn().mockResolvedValue(''),
  getCaretRect: jest.fn().mockResolvedValue({ x: 0, y: 0, width: 0, height: 0 }),
};

jest.mock('react-native-enriched-markdown', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const EnrichedMarkdownTextInput = React.forwardRef(
    (props: Record<string, unknown>, ref: unknown) => {
      React.useImperativeHandle(ref, () => mockEditorMethods);
      return React.createElement('EnrichedMarkdownTextInput', props);
    },
  );
  return { EnrichedMarkdownTextInput };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockEditorMethods.getMarkdown.mockResolvedValue('');
});

describe('EditorCuerpoEnriquecido', () => {
  it('emite el Markdown al escribir y expone la API imperativa', () => {
    const cambios: string[] = [];
    const ref = createRef<EnrichedMarkdownTextInputInstance>();
    let arbol!: ReturnType<typeof create>;
    act(() => {
      arbol = create(
        <EditorCuerpoEnriquecido
          ref={ref}
          valorInicial="Hola"
          onChangeMarkdown={(md) => cambios.push(md)}
        />,
      );
    });

    const input = arbol.root.findByProps({ defaultValue: 'Hola' });
    act(() => input.props.onChangeMarkdown('Hola mundo'));
    expect(cambios).toEqual(['Hola mundo']);

    act(() => ref.current?.toggleBold());
    expect(mockEditorMethods.toggleBold).toHaveBeenCalled();
    act(() => arbol.unmount());
  });

  it('aplica snapshots externos de undo/redo con setValue', () => {
    let arbol!: ReturnType<typeof create>;
    act(() => {
      arbol = create(
        <EditorCuerpoEnriquecido
          valorInicial=""
          onChangeMarkdown={() => {}}
          revision={0}
        />,
      );
    });
    act(() => {
      arbol.update(
        <EditorCuerpoEnriquecido
          valorInicial=""
          valorExterno="**Texto**"
          seleccionExterna={{ start: 2, end: 7 }}
          revision={1}
          onChangeMarkdown={() => {}}
        />,
      );
    });
    expect(mockEditorMethods.setValue).toHaveBeenCalledWith('**Texto**');
    act(() => arbol.unmount());
  });

  it('en web declara las medidas en px: lineHeight no puede ser un multiplicador CSS', () => {
    const OS_ORIGINAL = Platform.OS;
    (Platform as { OS: string }).OS = 'web';
    try {
      let arbol!: ReturnType<typeof create>;
      act(() => {
        arbol = create(
          <EditorCuerpoEnriquecido valorInicial="" onChangeMarkdown={() => {}} />,
        );
      });

      const estilo = arbol.root.findByProps({ defaultValue: '' }).props.style;
      // RN: 24 px de interlineado. CSS: "24" sería 24 × 16 px por línea.
      expect(estilo.lineHeight).toBe('24px');
      expect(estilo.fontSize).toBe('16px');
      expect(estilo.minHeight).toBe('340px');
      expect(estilo.textAlign).toBe('left');
      act(() => arbol.unmount());
    } finally {
      (Platform as { OS: string }).OS = OS_ORIGINAL;
    }
  });

  it('desactiva formatos sin paridad con el lector', () => {
    let arbol!: ReturnType<typeof create>;
    act(() => {
      arbol = create(
        <EditorCuerpoEnriquecido valorInicial="" onChangeMarkdown={() => {}} />,
      );
    });
    const input = arbol.root.findByProps({ defaultValue: '' });
    expect(input.props.formatMenuConfig.underline.enabled).toBe(false);
    expect(input.props.formatMenuConfig.spoiler.enabled).toBe(false);
    expect(input.props.selectionMenuConfig.format.label).toBe('Formato');
    act(() => arbol.unmount());
  });
});
