export const ROLES = ['ESTUDIANTE', 'COMUNICADOR', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

/** Jerarquía implícita: ADMIN > COMUNICADOR > ESTUDIANTE. */
const HIERARCHY: Record<Role, number> = {
  ESTUDIANTE: 0,
  COMUNICADOR: 1,
  ADMIN: 2,
};

export function roleRank(role: string): number {
  return HIERARCHY[role as Role] ?? -1;
}

/** Verdadero si el rol del usuario alcanza (o supera) el rol requerido. */
export function hasRole(userRole: string, required: Role): boolean {
  return roleRank(userRole) >= roleRank(required);
}
