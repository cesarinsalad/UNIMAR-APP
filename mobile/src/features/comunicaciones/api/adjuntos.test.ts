import { Platform } from 'react-native';
import { uploadAsync } from 'expo-file-system/legacy';
import {
  esUrlNgrok,
  fuenteImagen,
  resolverUrlImagen,
  subirArchivo,
} from './adjuntos.api';

jest.mock('@/shared/api/axios', () => ({ api: {} }));
jest.mock('expo-file-system/legacy', () => ({ uploadAsync: jest.fn() }));

const mockUpload = uploadAsync as jest.MockedFunction<typeof uploadAsync>;

const ARCHIVO = { uri: 'file:///tmp/portada.jpg', mimeType: 'image/jpeg' };

function respuesta(status: number) {
  return { status, headers: {}, body: '', mimeType: 'image/jpeg' };
}

describe('esUrlNgrok', () => {
  it('detecta dominios de túnel ngrok y descarta producción o URIs locales', () => {
    expect(esUrlNgrok('https://moonbeam-frosted-condition.ngrok-free.dev/storage/v1/x')).toBe(
      true,
    );
    expect(esUrlNgrok('https://demo.ngrok-free.app/x')).toBe(true);
    expect(esUrlNgrok('https://demo.ngrok.io/x')).toBe(true);
    expect(esUrlNgrok('https://xyz.supabase.co/storage/v1/object/sign/x')).toBe(false);
    expect(esUrlNgrok('file:///tmp/portada.jpg')).toBe(false);
    expect(esUrlNgrok('blob:https://unimarapp.pages.dev/abc')).toBe(false);
    expect(esUrlNgrok('no-es-url')).toBe(false);
  });
});

describe('subirArchivo (fase 2 del flujo de adjuntos)', () => {
  const osOriginal = Platform.OS;

  beforeEach(() => {
    mockUpload.mockReset();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: osOriginal, configurable: true });
  });

  it('incluye ngrok-skip-browser-warning cuando la URL firmada pasa por ngrok', async () => {
    mockUpload.mockResolvedValue(respuesta(200));

    await subirArchivo(
      'https://demo.ngrok-free.dev/storage/v1/object/upload/sign/x?token=t',
      ARCHIVO,
    );

    expect(mockUpload).toHaveBeenCalledWith(
      'https://demo.ngrok-free.dev/storage/v1/object/upload/sign/x?token=t',
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

  it('omite ngrok-skip-browser-warning en URLs de producción (Supabase Cloud)', async () => {
    mockUpload.mockResolvedValue(respuesta(200));

    await subirArchivo(
      'https://xyz.supabase.co/storage/v1/object/upload/sign/x?token=t',
      ARCHIVO,
    );

    expect(mockUpload).toHaveBeenCalledWith(
      'https://xyz.supabase.co/storage/v1/object/upload/sign/x?token=t',
      ARCHIVO.uri,
      expect.objectContaining({
        httpMethod: 'PUT',
        uploadType: 1,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      }),
    );
  });

  it('lanza con el status real cuando Storage rechaza (uploadAsync no lanza solo)', async () => {
    mockUpload.mockResolvedValue(respuesta(403));

    await expect(
      subirArchivo('https://demo.ngrok-free.dev/storage/v1/x?token=t', ARCHIVO),
    ).rejects.toThrow('403');
  });

  it('no lanza con 2xx', async () => {
    mockUpload.mockResolvedValue(respuesta(201));

    await expect(
      subirArchivo('https://demo.ngrok-free.dev/storage/v1/x?token=t', ARCHIVO),
    ).resolves.toBeUndefined();
  });
});

describe('fuenteImagen y resolverUrlImagen', () => {
  const osOriginal = Platform.OS;
  const fetchOriginal = globalThis.fetch;
  const createObjectUrlOriginal = URL.createObjectURL;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: osOriginal, configurable: true });
    globalThis.fetch = fetchOriginal;
    URL.createObjectURL = createObjectUrlOriginal;
  });

  it('adjunta cabecera ngrok solo en nativo y solo para URLs ngrok', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    expect(fuenteImagen('https://demo.ngrok-free.dev/storage/v1/img?token=t')).toEqual({
      uri: 'https://demo.ngrok-free.dev/storage/v1/img?token=t',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    expect(fuenteImagen('https://xyz.supabase.co/storage/v1/img?token=t')).toEqual({
      uri: 'https://xyz.supabase.co/storage/v1/img?token=t',
    });

    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    expect(fuenteImagen('https://demo.ngrok-free.dev/storage/v1/img?token=t')).toEqual({
      uri: 'https://demo.ngrok-free.dev/storage/v1/img?token=t',
    });
  });

  it('en web resuelve URLs ngrok vía fetch con header y deja intactas las de producción', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const mockFetch = jest.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    URL.createObjectURL = jest.fn(() => 'blob:https://unimarapp.pages.dev/portada-1');

    const urlProd = 'https://xyz.supabase.co/storage/v1/object/sign/x?token=t';
    await expect(resolverUrlImagen(urlProd)).resolves.toBe(urlProd);
    expect(mockFetch).not.toHaveBeenCalled();

    const urlNgrok = 'https://demo.ngrok-free.dev/storage/v1/object/sign/x?token=t';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      blob: async () => ({ size: 100 }),
    });

    await expect(resolverUrlImagen(urlNgrok)).resolves.toBe(
      'blob:https://unimarapp.pages.dev/portada-1',
    );
    expect(mockFetch).toHaveBeenCalledWith(urlNgrok, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/html; charset=utf-8' },
      blob: async () => ({ size: 500 }),
    });
    await expect(resolverUrlImagen(urlNgrok)).rejects.toThrow('imagen válida');
  });

  it('en nativo devuelve la URL tal cual sin ejecutar fetch', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const mockFetch = jest.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const urlNgrok = 'https://demo.ngrok-free.dev/storage/v1/object/sign/x?token=t';
    await expect(resolverUrlImagen(urlNgrok)).resolves.toBe(urlNgrok);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
