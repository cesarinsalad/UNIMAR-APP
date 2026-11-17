import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import * as DocumentPicker from 'expo-document-picker';

import type { Adjunto } from '../types';
import { SeccionAdjuntosPaso, type ArchivoAdjuntoCola } from './SeccionAdjuntosPaso';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1200 }),
}));

const mockPicker = DocumentPicker.getDocumentAsync as jest.MockedFunction<
  typeof DocumentPicker.getDocumentAsync
>;

function adjunto(overrides: Partial<Adjunto> = {}): Adjunto {
  return {
    id: 'adj-1',
    comunicadoId: 'com-1',
    storagePath: 'com-1/archivo.pdf',
    nombre: 'archivo.pdf',
    mimeType: 'application/pdf',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function nuevo(overrides: Partial<ArchivoAdjuntoCola> = {}): ArchivoAdjuntoCola {
  return {
    clave: 'clave-1',
    uri: 'file:///tmp/doc.pdf',
    nombre: 'doc.pdf',
    mimeType: 'application/pdf',
    tamano: 2048,
    ...overrides,
  };
}

function montar(
  overrides: Partial<Parameters<typeof SeccionAdjuntosPaso>[0]> = {},
): {
  arbol: ReactTestRenderer;
  props: Parameters<typeof SeccionAdjuntosPaso>[0];
} {
  const props: Parameters<typeof SeccionAdjuntosPaso>[0] = {
    existentes: [],
    nuevos: [],
    porEliminar: [],
    editable: true,
    onAgregar: jest.fn(),
    onQuitarNuevo: jest.fn(),
    onMarcarExistente: jest.fn(),
    onDesmarcarExistente: jest.fn(),
    ...overrides,
  };
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = create(<SeccionAdjuntosPaso {...props} />);
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SeccionAdjuntosPaso', () => {
  it('sin archivos deja el botón de añadir y no muestra filas', () => {
    const { arbol } = montar();

    expect(contieneTexto(arbol, 'Añadir archivo')).toBe(true);
    expect(contieneTexto(arbol, 'Ya guardado')).toBe(false);
    act(() => arbol.unmount());
  });

  it('agrega solo los archivos válidos y reporta los rechazados', async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/doc.pdf',
          name: 'doc.pdf',
          mimeType: 'application/pdf',
          size: 2048,
        },
        {
          uri: 'file:///tmp/grande.png',
          name: 'grande.png',
          mimeType: 'image/png',
          size: 6 * 1024 * 1024,
        },
      ],
    } as DocumentPicker.DocumentPickerResult);

    const { arbol, props } = montar();

    await act(async () => {
      boton(arbol, 'Añadir archivo').props.onPress();
    });

    expect(props.onAgregar).toHaveBeenCalledWith([
      expect.objectContaining({ nombre: 'doc.pdf', tamano: 2048 }),
    ]);
    expect(
      contieneTexto(
        arbol,
        'grande.png: El tamaño máximo es 5 MB',
      ),
    ).toBe(true);
    act(() => arbol.unmount());
  });

  it('muestra los archivos en cola con su tamaño y permite quitarlos', () => {
    const { arbol, props } = montar({ nuevos: [nuevo()] });

    expect(contieneTexto(arbol, 'doc.pdf')).toBe(true);
    expect(contieneTexto(arbol, '2.0 KB · Se subirá al guardar')).toBe(true);

    act(() => boton(arbol, 'Quitar doc.pdf').props.onPress());

    expect(props.onQuitarNuevo).toHaveBeenCalledWith('clave-1');
    act(() => arbol.unmount());
  });

  it('marca un existente para borrar al guardar y permite deshacer', () => {
    const existente = adjunto();
    const { arbol, props } = montar({ existentes: [existente] });

    expect(contieneTexto(arbol, 'Ya guardado')).toBe(true);
    act(() => boton(arbol, 'Eliminar archivo.pdf').props.onPress());
    expect(props.onMarcarExistente).toHaveBeenCalledWith(existente);

    act(() => arbol.unmount());

    const marcado = montar({ existentes: [existente], porEliminar: [existente] });
    expect(contieneTexto(marcado.arbol, 'Se eliminará al guardar')).toBe(true);
    act(() =>
      boton(marcado.arbol, 'Deshacer eliminación de archivo.pdf').props.onPress(),
    );
    expect(marcado.props.onDesmarcarExistente).toHaveBeenCalledWith('adj-1');
    act(() => marcado.arbol.unmount());
  });

  it('excluye la portada de la lista de adjuntos existentes', () => {
    const portada = adjunto({
      id: 'adj-portada',
      storagePath: 'com-1/portada.png',
      nombre: 'portada.png',
      mimeType: 'image/png',
    });
    const documento = adjunto({
      id: 'adj-doc',
      storagePath: 'com-1/documento.pdf',
      nombre: 'documento.pdf',
    });
    const { arbol } = montar({
      existentes: [portada, documento],
      portadaPath: 'com-1/portada.png',
    });

    expect(contieneTexto(arbol, 'documento.pdf')).toBe(true);
    expect(contieneTexto(arbol, 'portada.png')).toBe(false);
    act(() => arbol.unmount());
  });

  it('deshabilita la acción de añadir cuando el asistente está guardando', () => {
    const { arbol } = montar({ editable: false });

    expect(boton(arbol, 'Añadir archivo').props.accessibilityState.disabled).toBe(
      true,
    );
    act(() => arbol.unmount());
  });
});
