import { formatearBadge } from './badge';

describe('formatearBadge', () => {
  it('0 y undefined → sin badge', () => {
    expect(formatearBadge(0)).toBeUndefined();
    expect(formatearBadge(undefined)).toBeUndefined();
  });

  it('1–99 → número', () => {
    expect(formatearBadge(1)).toBe(1);
    expect(formatearBadge(50)).toBe(50);
    expect(formatearBadge(99)).toBe(99);
  });

  it('≥100 → 99+', () => {
    expect(formatearBadge(100)).toBe('99+');
    expect(formatearBadge(250)).toBe('99+');
  });
});