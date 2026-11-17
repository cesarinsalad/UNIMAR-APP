import { Image } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { usePortada } from '../hooks/usePortada';
import type { Comunicado } from '../types';
import { ComunicadoCard } from './ComunicadoCard';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: () => null },
  useReducedMotion: () => true,
}));
// El barrel de shared/ui arrastra Select → HojaInferior (TrueSheet ESM que
// Jest no transforma). A este test solo le interesa la card.
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
jest.mock('../hooks/usePortada', () => ({
  usePortada: jest.fn(),
}));

const mockPortada = usePortada as jest.MockedFunction<typeof usePortada>;

const COMUNICADO: Comunicado = {
  id: 'com-1',
  titulo: 'Foro «Alianza por la Educación»',
  cuerpo: 'Invita a debatir las acciones para renovar el sistema educativo.',
  autorId: 'usr-1',
  estado: 'PUBLICADO',
  aprobadoPor: null,
  motivoRechazo: null,
  publicadoAt: '2026-11-16T10:00:00.000Z',
  programadoPara: null,
  expiraAt: null,
  imagenPath: 'com-1/portada.jpg',
  imagenPie: null,
  categoria: 'INSTITUCIONAL',
  autorNombre: 'Ana Administradora',
  createdAt: '2026-11-16T10:00:00.000Z',
  updatedAt: '2026-11-16T10:00:00.000Z',
  decanatoIds: [],
};

function montar(portada: {
  url?: string;
  cargando: boolean;
  error?: Error | null;
}): ReactTestRenderer {
  mockPortada.mockReturnValue({
    url: portada.url,
    cargando: portada.cargando,
    error: portada.error ?? null,
  } as ReturnType<typeof usePortada>);

  let arbol!: ReactTestRenderer;
  act(() => {
    arbol = create(<ComunicadoCard comunicado={COMUNICADO} />);
  });
  return arbol;
}

function esqueletos(arbol: ReactTestRenderer) {
  return arbol.root.findAllByProps({ testID: 'portada-skeleton' });
}

describe('ComunicadoCard — skeleton de portada', () => {
  it('mientras la URL firmada carga pinta el skeleton y no la imagen', () => {
    const arbol = montar({ cargando: true });

    expect(esqueletos(arbol).length).toBeGreaterThan(0);
    expect(arbol.root.findAllByType(Image)).toHaveLength(0);
    act(() => arbol.unmount());
  });

  it('con URL firmada pinta la imagen y retira el skeleton', () => {
    const arbol = montar({
      url: 'https://cdn.local/portada.jpg',
      cargando: false,
    });

    expect(esqueletos(arbol)).toHaveLength(0);
    expect(arbol.root.findAllByType(Image)).toHaveLength(1);
    act(() => arbol.unmount());
  });

  it('sin URL y sin carga usa el placeholder, sin skeleton ni imagen', () => {
    const arbol = montar({ cargando: false });

    expect(esqueletos(arbol)).toHaveLength(0);
    expect(arbol.root.findAllByType(Image)).toHaveLength(0);
    act(() => arbol.unmount());
  });
});
