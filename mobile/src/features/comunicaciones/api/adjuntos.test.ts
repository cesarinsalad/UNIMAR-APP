import { uploadAsync } from 'expo-file-system/legacy';
import { subirArchivo } from './adjuntos.api';

jest.mock('@/shared/api/axios', () => ({ api: {} }));
jest.mock('expo-file-system/legacy', () => ({ uploadAsync: jest.fn() }));

const mockUpload = uploadAsync as jest.MockedFunction<typeof uploadAsync>;

const ARCHIVO = { uri: 'file:///tmp/portada.jpg', mimeType: 'image/jpeg' };

function respuesta(status: number) {
  return { status, headers: {}, body: '', mimeType: 'image/jpeg' };
}

describe('subirArchivo (fase 2 del flujo de adjuntos)', () => {
  beforeEach(() => mockUpload.mockReset());

  it('hace PUT binario a la URL firmada con los headers esperados', async () => {
    mockUpload.mockResolvedValue(respuesta(200));

    await subirArchivo('https://bff.dev/storage/v1/object/upload/sign/x?token=t', ARCHIVO);

    expect(mockUpload).toHaveBeenCalledWith(
      'https://bff.dev/storage/v1/object/upload/sign/x?token=t',
      ARCHIVO.uri,
      expect.objectContaining({
        httpMethod: 'PUT',
        uploadType: 1,
        headers: {
          'Content-Type': 'image/jpeg',
          'ngrok-skip-browser-warning': 'true',
        },
      }),
    );
  });

  it('lanza con el status real cuando Storage rechaza (uploadAsync no lanza solo)', async () => {
    mockUpload.mockResolvedValue(respuesta(403));

    await expect(subirArchivo('https://bff.dev/storage/v1/x?token=t', ARCHIVO)).rejects.toThrow(
      '403',
    );
  });

  it('no lanza con 2xx', async () => {
    mockUpload.mockResolvedValue(respuesta(201));

    await expect(
      subirArchivo('https://bff.dev/storage/v1/x?token=t', ARCHIVO),
    ).resolves.toBeUndefined();
  });
});
