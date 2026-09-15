/** Configuración de Jest para el proyecto mobile (preset jest-expo). */
module.exports = {
  preset: 'jest-expo',
  // El orden importa: '@/(.*)$' capturaría también '@/assets/*' si fuera primero.
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};