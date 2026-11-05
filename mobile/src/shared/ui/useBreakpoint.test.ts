import { breakpointDesdeAncho, UMBRAL_ESCRITORIO, UMBRAL_TABLET } from './useBreakpoint';

describe('breakpointDesdeAncho', () => {
  it('móvil por debajo de 768 (el caso del phone común)', () => {
    expect(breakpointDesdeAncho(390)).toBe('movil');
    expect(breakpointDesdeAncho(0)).toBe('movil');
  });

  it('tablet entre 768 y 1023 inclusive', () => {
    expect(breakpointDesdeAncho(UMBRAL_TABLET)).toBe('tablet');
    expect(breakpointDesdeAncho(900)).toBe('tablet');
    expect(breakpointDesdeAncho(1023)).toBe('tablet');
  });

  it('escritorio desde 1024 (doc §3: disposición amplia)', () => {
    expect(breakpointDesdeAncho(UMBRAL_ESCRITORIO)).toBe('escritorio');
    expect(breakpointDesdeAncho(1440)).toBe('escritorio');
  });
});
