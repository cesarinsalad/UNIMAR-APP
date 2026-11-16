import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import {
  useAdjuntos,
  useEliminarAdjunto,
  useSubirAdjunto,
} from '../hooks/useAdjuntos';
import type { Adjunto } from '../types';
import { SeccionAdjuntos } from './SeccionAdjuntos';

jest.mock('../hooks/useAdjuntos', () => ({
  useAdjuntos: jest.fn(),
  useSubirAdjunto: jest.fn(),
  useEliminarAdjunto: jest.fn(),
}));
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));
jest.mock('@/shared/api/axios', () => ({
  ApiError: class ApiError extends Error {},
}));

const mockAdjuntos = useAdjuntos as jest.MockedFunction<typeof useAdjuntos>;
const mockSubir = useSubirAdjunto as jest.MockedFunction<typeof useSubirAdjunto>;
const mockEliminar = useEliminarAdjunto as jest.MockedFunction<
  typeof useEliminarAdjunto
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

function preparar(data: Adjunto[] | undefined, cargando = false): void {
  mockAdjuntos.mockReturnValue({
    data,
    isPending: cargando,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useAdjuntos>);
  mockSubir.mockReturnValue({
    isPending: false,
    mutateAsync: jest.fn(),
  } as unknown as ReturnType<typeof useSubirAdjunto>);
  mockEliminar.mockReturnValue({
    isPending: false,
    mutateAsync: jest.fn(),
  } as unknown as ReturnType<typeof useEliminarAdjunto>);
}

function render(
  props: { puedeEditar?: boolean; portadaPath?: string | null } = {},
): ReactTestRenderer {
  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = create(
      <SeccionAdjuntos
        comunicadoId="com-1"
        puedeEditar={false}
        {...props}
      />,
    );
  });
  return arbol;
}

function contieneTexto(arbol: ReactTestRenderer, texto: string): boolean {
  return (
    arbol.root.findAll(
      (nodo) =>
        typeof nodo.props.children === 'string' &&
        nodo.props.children === texto,
    ).length > 0
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SeccionAdjuntos', () => {
  it('en lectura sin adjuntos no renderiza la sección vacía', () => {
    preparar([]);
    const arbol = render();

    expect(arbol.toJSON()).toBeNull();
    act(() => arbol.unmount());
  });

  it('en lectura no muestra la sección mientras carga', () => {
    preparar(undefined, true);
    const arbol = render();

    expect(arbol.toJSON()).toBeNull();
    act(() => arbol.unmount());
  });

  it('si solo existe la portada, la excluye y oculta la sección', () => {
    preparar([adjunto({ storagePath: 'com-1/portada.png', nombre: 'portada.png' })]);
    const arbol = render({ portadaPath: 'com-1/portada.png' });

    expect(arbol.toJSON()).toBeNull();
    act(() => arbol.unmount());
  });

  it('excluye la portada y conserva los adjuntos reales', () => {
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
    preparar([portada, documento]);

    const arbol = render({ portadaPath: 'com-1/portada.png' });

    expect(contieneTexto(arbol, 'Adjuntos')).toBe(true);
    expect(contieneTexto(arbol, 'documento.pdf')).toBe(true);
    expect(contieneTexto(arbol, 'portada.png')).toBe(false);
    act(() => arbol.unmount());
  });

  it('en edición mantiene la sección vacía para poder adjuntar', () => {
    preparar([]);
    const arbol = render({ puedeEditar: true });

    expect(contieneTexto(arbol, 'Adjuntos')).toBe(true);
    expect(contieneTexto(arbol, 'Adjuntar archivo')).toBe(true);
    expect(
      contieneTexto(arbol, 'Sin adjuntos. Agrega PDF o imágenes (máx. 5 MB).'),
    ).toBe(true);
    act(() => arbol.unmount());
  });
});
