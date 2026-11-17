import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { seleccionarPortada } from './portada.api';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-file-system/legacy', () => ({ getInfoAsync: jest.fn() }));

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const fs = FileSystem as jest.Mocked<typeof FileSystem>;

const MB = 1024 * 1024;

function asset(extra: Partial<ImagePicker.ImagePickerAsset> = {}): ImagePicker.ImagePickerAsset {
  return {
    uri: 'file:///tmp/portada.jpg',
    fileName: 'portada.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1024,
    width: 900,
    height: 600,
    ...extra,
  } as ImagePicker.ImagePickerAsset;
}

function elegir(a: ImagePicker.ImagePickerAsset) {
  picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
    granted: true,
  } as ImagePicker.PermissionResponse);
  picker.launchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [a],
  } as ImagePicker.ImagePickerResult);
}

describe('seleccionarPortada', () => {
  const osOriginal = Platform.OS;
  const docOriginal = globalThis.document;
  const createObjectUrlOriginal = URL.createObjectURL;
  const revokeObjectUrlOriginal = URL.revokeObjectURL;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: osOriginal, configurable: true });
    if (docOriginal === undefined) {
      delete (globalThis as { document?: Document }).document;
    } else {
      globalThis.document = docOriginal;
    }
    URL.createObjectURL = createObjectUrlOriginal;
    URL.revokeObjectURL = revokeObjectUrlOriginal;
  });

  it('devuelve el archivo listo para subirAdjunto', async () => {
    elegir(asset());

    await expect(seleccionarPortada(false)).resolves.toEqual({
      uri: 'file:///tmp/portada.jpg',
      nombre: 'portada.jpg',
      mimeType: 'image/jpeg',
      tamano: 1024,
    });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsEditing: true, aspect: [3, 2], quality: 0.8 }),
    );
  });

  it('null cuando el usuario cancela', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    } as ImagePicker.PermissionResponse);
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: true,
      assets: null,
    } as ImagePicker.ImagePickerResult);

    await expect(seleccionarPortada(false)).resolves.toBeNull();
  });

  it('lanza si el permiso está denegado', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: false,
    } as ImagePicker.PermissionResponse);

    await expect(seleccionarPortada(false)).rejects.toThrow('Permite el acceso a las fotos');
  });

  it('rechaza formatos que el BFF no admite como portada', async () => {
    elegir(asset({ mimeType: 'image/webp' }));

    await expect(seleccionarPortada(false)).rejects.toThrow('PNG o JPEG');
  });

  it('lanza si no se puede determinar el tamaño (evita el 400 de Zod)', async () => {
    elegir(asset({ fileSize: 0 }));
    fs.getInfoAsync.mockResolvedValue({ exists: true, size: 0 } as never);

    await expect(seleccionarPortada(false)).rejects.toThrow('No se pudo leer la imagen');
  });

  it('lanza antes de la firma si supera el límite de 5 MB', async () => {
    elegir(asset({ fileSize: 6 * MB }));

    await expect(seleccionarPortada(false)).rejects.toThrow('5 MB');
    expect(fs.getInfoAsync).not.toHaveBeenCalled();
  });

  it('mide con el filesystem cuando el picker no reporta fileSize', async () => {
    elegir(asset({ fileSize: undefined }));
    fs.getInfoAsync.mockResolvedValue({ exists: true, size: 2048 } as never);

    await expect(seleccionarPortada(false)).resolves.toEqual(
      expect.objectContaining({ tamano: 2048 }),
    );
  });

  it('en web normaliza a JPEG 3:2 mediante canvas y revoca el blob temporal', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const ctx = {
      fillStyle: '',
      fillRect: jest.fn(),
      drawImage: jest.fn(),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => ctx),
      toBlob: jest.fn((cb: (b: Blob | null) => void) => cb({ size: 4096 } as Blob)),
    };
    const img: {
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src?: string;
    } = {
      naturalWidth: 3000,
      naturalHeight: 3000,
      onload: null,
      onerror: null,
    };
    Object.defineProperty(img, 'src', {
      set() {
        queueMicrotask(() => img.onload?.());
      },
    });
    globalThis.document = {
      createElement: jest.fn((tag: string) => (tag === 'canvas' ? canvas : img)),
    } as unknown as Document;
    URL.createObjectURL = jest.fn(() => 'blob:https://unimarapp.pages.dev/normalizada');
    const revokeSpy = jest.fn();
    URL.revokeObjectURL = revokeSpy;

    elegir(
      asset({
        uri: 'blob:https://unimarapp.pages.dev/original',
        fileName: 'afiche.png',
        mimeType: 'image/png',
      }),
    );

    await expect(seleccionarPortada(false)).resolves.toEqual({
      uri: 'blob:https://unimarapp.pages.dev/normalizada',
      nombre: 'afiche.jpg',
      mimeType: 'image/jpeg',
      tamano: 4096,
    });
    expect(canvas.width).toBe(1800);
    expect(canvas.height).toBe(1200);
    expect(ctx.drawImage).toHaveBeenCalledWith(img, 0, 500, 3000, 2000, 0, 0, 1800, 1200);
    expect(revokeSpy).toHaveBeenCalledWith('blob:https://unimarapp.pages.dev/original');
  });

  it('en web rechaza imágenes que el navegador no puede decodificar', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const img: {
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src?: string;
    } = {
      naturalWidth: 0,
      naturalHeight: 0,
      onload: null,
      onerror: null,
    };
    Object.defineProperty(img, 'src', {
      set() {
        queueMicrotask(() => img.onerror?.());
      },
    });
    globalThis.document = {
      createElement: jest.fn(() => img),
    } as unknown as Document;
    URL.revokeObjectURL = jest.fn();

    elegir(asset({ uri: 'blob:https://unimarapp.pages.dev/corrupta' }));

    await expect(seleccionarPortada(false)).rejects.toThrow('No se pudo leer la imagen');
  });
});
