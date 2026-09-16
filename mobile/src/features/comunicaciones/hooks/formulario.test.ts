import {
  clampAudiencia,
  tieneErrores,
  validarFormularioComunicado,
} from './formulario';
import type { ErroresFormulario } from './formulario';

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