import {
  clampAudiencia,
  formatearTamano,
  tieneErrores,
  tieneErroresAdjunto,
  validarAdjunto,
  validarFormularioComunicado,
} from './formulario';
import type { ErroresFormulario } from './formulario';
import { MIMES_PERMITIDOS } from '../types';

const LIMITE = (n: number) => 'x'.repeat(n);

describe('validarFormularioComunicado', () => {
  it('formulario sano → sin errores', () => {
    const e = validarFormularioComunicado({ titulo: 'T', cuerpo: 'c', decanatoIds: [5] });
    expect(tieneErrores(e)).toBe(false);
  });

  it('título requerido y límite 200', () => {
    expect(validarFormularioComunicado({ titulo: ' ' }).titulo).toBe('El título es requerido');
    expect(validarFormularioComunicado({ titulo: LIMITE(201) }).titulo).toContain('200');
  });

  it('cuerpo requerido y límite 5000', () => {
    expect(validarFormularioComunicado({ cuerpo: '   ' }).cuerpo).toBe('El cuerpo es requerido');
    expect(validarFormularioComunicado({ cuerpo: LIMITE(5001) }).cuerpo).toContain('5000');
  });

  it('audiencia inválida detecta ids no positivos', () => {
    expect(validarFormularioComunicado({ decanatoIds: [0, -1] }).audiencia).toBe('Audiencia inválida');
    expect(validarFormularioComunicado({ decanatoIds: [3, 5] }).audiencia).toBeNull();
  });

  it('campos no presentes no generan error (modo editar parcial)', () => {
    const e: ErroresFormulario = validarFormularioComunicado({});
    expect(tieneErrores(e)).toBe(false);
  });
});

describe('clampAudiencia', () => {
  it('COMUNICADOR → fijo su decanato (anti-global)', () => {
    expect(clampAudiencia('COMUNICADOR', 5, [3])).toEqual([5]);
    expect(clampAudiencia('COMUNICADOR', 5, [])).toEqual([5]);
  });

  it('COMUNICADOR sin decanato → vacío (no puede enviar)', () => {
    expect(clampAudiencia('COMUNICADOR', null, [4])).toEqual([]);
  });

  it('ADMIN respeta la selección (incluido GLOBAL [])', () => {
    expect(clampAudiencia('ADMIN', null, [])).toEqual([]);
    expect(clampAudiencia('ADMIN', null, [3, 5])).toEqual([3, 5]);
  });
});

describe('validarAdjunto', () => {
  const archivoSano = {
    nombre: 'circular-septiembre.pdf',
    mimeType: 'application/pdf',
    tamano: 1024 * 512,
  };

  it('PDF de 512 KB → sin errores', () => {
    expect(tieneErroresAdjunto(validarAdjunto(archivoSano))).toBe(false);
  });

  it('mime no permitido → error', () => {
    const e = validarAdjunto({ ...archivoSano, mimeType: 'application/zip' });
    expect(e.mimeType).toContain('no permitido');
  });

  it.each(MIMES_PERMITIDOS)('%s permitido', (mime) => {
    expect(validarAdjunto({ ...archivoSano, mimeType: mime }).mimeType).toBeNull();
  });

  it('tamaño sobre 5 MB → error', () => {
    const e = validarAdjunto({ ...archivoSano, tamano: 5 * 1024 * 1024 + 1 });
    expect(e.tamano).toContain('5 MB');
  });

  it('tamaño cero o negativo → error', () => {
    expect(validarAdjunto({ ...archivoSano, tamano: 0 }).tamano).toBe('Tamaño inválido');
    expect(validarAdjunto({ ...archivoSano, tamano: -1 }).tamano).toBe('Tamaño inválido');
  });

  it('nombre vacío o >255 → error', () => {
    expect(validarAdjunto({ ...archivoSano, nombre: '  ' }).nombre).toBe('El nombre es requerido');
    expect(validarAdjunto({ ...archivoSano, nombre: LIMITE(256) }).nombre).toContain('255');
  });
});

describe('formatearTamano', () => {
  it.each([
    [512, '512 B'],
    [1023, '1023 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [5 * 1024 * 1024, '5.0 MB'],
  ])('%v bytes → %s', (bytes, esperado) => {
    expect(formatearTamano(bytes)).toBe(esperado);
  });
});