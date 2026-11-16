import { describe, expect, it } from 'vitest';
import { publicarUrlFirmada } from './supabaseStorageService';

const INTERNA =
  'http://127.0.0.1:54321/storage/v1/object/upload/sign/comunicado-adjuntos/abc/portada.jpg?token=firma';

describe('publicarUrlFirmada', () => {
  it('devuelve la URL intacta si no hay base pública (producción/Supabase Cloud)', () => {
    expect(publicarUrlFirmada(INTERNA, undefined)).toBe(INTERNA);
    expect(publicarUrlFirmada(INTERNA, '')).toBe(INTERNA);
  });

  it('sustituye protocolo y host conservando path y token', () => {
    const publica = publicarUrlFirmada(INTERNA, 'https://moonbeam-frosted-condition.ngrok-free.dev');

    expect(publica).toBe(
      'https://moonbeam-frosted-condition.ngrok-free.dev/storage/v1/object/upload/sign/comunicado-adjuntos/abc/portada.jpg?token=firma',
    );
  });

  it('acepta bases con puerto y con slash final', () => {
    const publica = publicarUrlFirmada(INTERNA, 'http://192.168.1.50:3000/');

    expect(publica).toBe(
      'http://192.168.1.50:3000/storage/v1/object/upload/sign/comunicado-adjuntos/abc/portada.jpg?token=firma',
    );
  });

  it('funciona también con URLs de descarga (otra ruta, mismo token)', () => {
    const descarga =
      'http://127.0.0.1:54321/storage/v1/object/sign/comunicado-adjuntos/abc/portada.jpg?token=firma';

    expect(publicarUrlFirmada(descarga, 'https://midominio.dev')).toBe(
      'https://midominio.dev/storage/v1/object/sign/comunicado-adjuntos/abc/portada.jpg?token=firma',
    );
  });
});
