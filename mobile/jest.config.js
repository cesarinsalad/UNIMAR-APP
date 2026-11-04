/** Configuración de Jest para el proyecto mobile (preset jest-expo). */
module.exports = {
  preset: 'jest-expo',
  // El orden importa: '@/(.*)$' capturaría también '@/assets/*' si fuera primero.
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    // Sheets (true-sheet) al mock oficial: el módulo nativo no existe en el
    // runtime de test — wirse por API declarativa (present/dismiss noops).
    '^@lodev09/react-native-true-sheet$': '@lodev09/react-native-true-sheet/mock',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
