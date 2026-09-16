/** Claves de React Query del módulo académico. */
export const CLAVES_ACADEMICO = {
  perfil: ['academico', 'perfil'] as const,
  materias: ['academico', 'materias'] as const,
  materia: (id: string) => ['academico', 'materias', id] as const,
  pensum: (carreraId: string) => ['academico', 'pensum', carreraId] as const,
  historial: ['academico', 'historial'] as const,
  prefijo: ['academico'] as const,
};