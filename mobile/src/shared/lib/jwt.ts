/**
 * Decodificador de JWT.
 * El backend emite tokens con claims { sub, role, decanato_id, nombre, exp, iat }.
 * Solo decodificamos (no verificamos firma): la verificación ocurre en el BFF.
 * Si el token está malformado, devolvemos null; el caller decide qué hacer.
 */

export interface JwtClaims {
  sub: string;
  role: 'ESTUDIANTE' | 'COMUNICADOR' | 'ADMIN';
  decanato_id: number | null;
  nombre: string;
  exp: number;
  iat: number;
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  if (typeof globalThis.atob === 'function') {
    return decodeURIComponent(
      globalThis
        .atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  }
  const BufferCtor = (globalThis as { Buffer?: { from(data: string, enc: 'base64'): { toString(enc: 'utf-8'): string } } }).Buffer;
  if (!BufferCtor) {
    throw new Error('No hay decodificador base64 disponible en este runtime.');
  }
  return BufferCtor.from(padded, 'base64').toString('utf-8');
}

function isJwtClaims(value: unknown): value is JwtClaims {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sub === 'string' &&
    (v.role === 'ESTUDIANTE' || v.role === 'COMUNICADOR' || v.role === 'ADMIN') &&
    (typeof v.decanato_id === 'number' || v.decanato_id === null) &&
    typeof v.nombre === 'string' &&
    typeof v.exp === 'number' &&
    typeof v.iat === 'number'
  );
}

export function decodeJwt(token: string): JwtClaims | null {
  if (!token || typeof token !== 'string') return null;
  const segments = token.split('.');
  if (segments.length !== 3) return null;
  const payload = segments[1];
  if (!payload) return null;
  try {
    const json = base64UrlDecode(payload);
    const parsed: unknown = JSON.parse(json);
    return isJwtClaims(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isExpired(claims: JwtClaims, nowMs: number = Date.now()): boolean {
  return claims.exp * 1000 <= nowMs;
}

export function expiresWithin(claims: JwtClaims, windowMs: number, nowMs: number = Date.now()): boolean {
  return claims.exp * 1000 - nowMs <= windowMs;
}