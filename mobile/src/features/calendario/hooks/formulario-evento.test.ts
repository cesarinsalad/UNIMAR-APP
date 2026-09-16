import {
  ajustarDiaCompleto,
  audienciaParaEvento,
  finPredeterminado,
  PRESETS_RECORDATORIO,
  tieneErroresEvento,
  validarFormularioEvento,
} from './formulario-evento';

const INICIO = new Date(2026, 8, 16, 9, 0, 0, 0); // 16 sep 09:00 local

describe('validarFormularioEvento', () => {
  it('formularío sano → sin errores', () => {
    expect(
      tieneErroresEvento(
        validarFormularioEvento({ titulo: 't', descripcion: null, inicio: INICIO, fin: finPredeterminado(INICIO) }),
      ),
    ).toBe(false);
  });

  it('título requerido y ≤200', () => {
    expect(validarFormularioEvento({ titulo: '  ', descripcion: null, inicio: INICIO, fin: null }).titulo).toBe(
      'El título es requerido',
    );
    expect(validarFormularioEvento({ titulo: 'x'.repeat(201), descripcion: null, inicio: INICIO, fin: null }).titulo).toContain(
      '200',
    );
  });

  it('descripción ≤2000 (null permitido)', () => {
    expect(validarFormularioEvento({ titulo: 't', descripcion: null, inicio: INICIO, fin: null }).descripcion).toBeNull();
    expect(validarFormularioEvento({ titulo: 't', descripcion: 'd'.repeat(2001), inicio: INICIO, fin: null }).descripcion).toContain(
      '2000',
    );
  });

  it('rango: fin antes que inicio → error', () => {
    expect(
      validarFormularioEvento({
        titulo: 't',
        descripcion: null,
        inicio: INICIO,
        fin: new Date(INICIO.getTime() - 1),
      }).rango,
    ).toContain('posterior');
  });
});

describe('finPredeterminado (Opción A)', () => {
  it('inicio + 1 hora', () => {
    expect(finPredeterminado(INICIO).getTime() - INICIO.getTime()).toBe(3_600_000);
  });
});

describe('ajustarDiaCompleto', () => {
  it('activo → inicio 00:00 y fin 23:59:59.999 del día del inicio', () => {
    const fin = new Date(2026, 8, 17, 10, 0);
    const r = ajustarDiaCompleto(INICIO, fin, true);
    expect(r.inicio.getHours()).toBe(0);
    expect(r.inicio.getMinutes()).toBe(0);
    expect(r.fin!.getDate()).toBe(16);
    expect(r.fin!.getHours()).toBe(23);
    expect(r.fin!.getMinutes()).toBe(59);
  });

  it('sin fin (null) mantiene null el fin', () => {
    const r = ajustarDiaCompleto(INICIO, null, true);
    expect(r.fin).toBeNull();
  });

  it('desactivado devuelve el par sin tocar', () => {
    const fin = new Date(2026, 8, 16, 11, 0);
    const r = ajustarDiaCompleto(INICIO, fin, false);
    expect(r.inicio).toBe(INICIO);
    expect(r.fin).toBe(fin);
  });
});

describe('PRESETS_RECORDATORIO', () => {
  it('los 4 presets pactados y el primero es "sin recordatorio"', () => {
    expect(PRESETS_RECORDATORIO).toHaveLength(4);
    expect(PRESETS_RECORDATORIO.map((p) => p.minutos)).toEqual([null, 15, 60, 1440]);
  });
});

describe('audienciaParaEvento', () => {
  it('PERSONAL → null (no aplica)', () => {
    expect(audienciaParaEvento('ESTUDIANTE', 'PERSONAL', 5, [3])).toBeNull();
  });

  it('OFICIAL + COMUNICADOR → fijo su decanato (anti-global; [] prohibido)', () => {
    expect(audienciaParaEvento('COMUNICADOR', 'OFICIAL', 5, [])).toEqual([5]);
    expect(audienciaParaEvento('COMUNICADOR', 'OFICIAL', 5, null)).toEqual([5]);
    expect(audienciaParaEvento('COMUNICADOR', 'OFICIAL', null, [3])).toBeNull();
  });

  it('OFICIAL + ADMIN → selección libre con [] (GLOBAL)', () => {
    expect(audienciaParaEvento('ADMIN', 'OFICIAL', null, [])).toEqual([]);
    expect(audienciaParaEvento('ADMIN', 'OFICIAL', null, [3, 5])).toEqual([3, 5]);
    expect(audienciaParaEvento('ADMIN', 'OFICIAL', null, null)).toEqual([]);
  });

  it('OFICIAL + ESTUDIANTE (no puede crear oficiales) → [] defensivo', () => {
    expect(audienciaParaEvento('ESTUDIANTE', 'OFICIAL', 5, null)).toEqual([]);
  });
});